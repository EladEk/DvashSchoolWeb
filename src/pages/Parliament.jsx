import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useTranslation } from '../contexts/TranslationContext'
import { useEffectiveRole, UserRole } from '../utils/requireRole'
import EditableText from '../components/EditableText'
import SubjectSubmitForm from '../components/parliament/SubjectSubmitForm'
import './Parliament.css'

function tsMillis(x) {
  if (!x) return 0
  if (typeof x?.toMillis === 'function') return x.toMillis()
  const d = x instanceof Date ? x : new Date(x)
  const t = d.getTime()
  return Number.isFinite(t) ? t : 0
}

export default function Parliament() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role: userRole } = useEffectiveRole()
  const [dates, setDates] = useState([])
  const [subjects, setSubjects] = useState([])
  const [myPending, setMyPending] = useState([])
  const [myRejected, setMyRejected] = useState([])
  const [editing, setEditing] = useState(null)
  const [current, setCurrent] = useState(null)
  const [notes, setNotes] = useState([])
  const [newNoteText, setNewNoteText] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [replyingToNoteId, setReplyingToNoteId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}') || {}
    } catch {
      return {}
    }
  }, [])
  const user = session?.user || session

  const userUid =
    user?.uid ||
    user?.id ||
    user?.user?.uid ||
    session?.uid ||
    ''

  const isLoggedIn = !!userUid

  const handleLogout = () => {
    localStorage.removeItem('session')
    window.location.reload()
  }

  // Dates
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'parliamentDates')),
      snap => {
        const list = snap.docs.map(d => {
          const data = d.data()
          // Ensure isOpen is a boolean
          const dateObj = { 
            id: d.id, 
            ...data,
            isOpen: data.isOpen !== false && data.isOpen !== 'false' // Default to true if not explicitly false
          }
          return dateObj
        })
        list.sort((a, b) => tsMillis(a.date) - tsMillis(b.date))
        console.log('Parliament - loaded dates:', list)
        console.log('Parliament - dates with isOpen:', list.map(d => ({ id: d.id, title: d.title, isOpen: d.isOpen })))
        setDates(list)
      }
    )
    return () => unsub()
  }, [])

  // Approved subjects (public)
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'parliamentSubjects'), where('status', '==', 'approved')),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt))
        setSubjects(list)
      }
    )
    return () => unsub()
  }, [])

  // My submissions (pending + rejected)
  useEffect(() => {
    if (!userUid) return
    const unsub = onSnapshot(
      query(collection(db, 'parliamentSubjects'), where('createdByUid', '==', userUid)),
      snap => {
        const mine = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        const pendingOnly = mine.filter(s => s.status === 'pending')
        const rejectedOnly = mine.filter(s => s.status === 'rejected')

        const sortFn = (a, b) => {
          const ta = tsMillis(a.createdAt) || 0
          const tb = tsMillis(b.createdAt) || 0
          return tb - ta
        }
        pendingOnly.sort(sortFn)
        rejectedOnly.sort(sortFn)

        setMyPending(pendingOnly)
        setMyRejected(rejectedOnly)
      }
    )
    return () => unsub()
  }, [userUid])

  // Fetch notes for current subject
  useEffect(() => {
    if (!current?.id) {
      setNotes([])
      return
    }

    const unsub = onSnapshot(
      query(collection(db, 'parliamentNotes'), where('subjectId', '==', current.id)),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt))
        setNotes(list)
      }
    )
    return () => unsub()
  }, [current?.id])

  // Group approved subjects by date
  const { openGroups, closedGroups } = useMemo(() => {
    const map = new Map()
    for (const s of subjects) {
      const date = dates.find(d => d.id === s.dateId) || null
      const k = s.dateId || '__unknown__'
      if (!map.has(k)) map.set(k, { date, items: [] })
      map.get(k).items.push(s)
    }
    const all = Array.from(map.values())
    const openGroups = all
      .filter(g => g.date?.isOpen === true)
      .sort((a, b) => tsMillis(a.date?.date) - tsMillis(b.date?.date))
    const closedGroups = all
      .filter(g => g.date?.isOpen !== true)
      .sort((a, b) => tsMillis(a.date?.date) - tsMillis(b.date?.date))
    return { openGroups, closedGroups }
  }, [subjects, dates])

  // Check permissions
  const sessionRole = session?.role || ''
  const effectiveRole = userRole || sessionRole
  const canDeleteNotes = effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.COMMITTEE
  const canEditAnyNote = effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.COMMITTEE
  
  // Check if user can edit/delete a specific note
  const canEditNote = (note) => {
    if (!note || !isLoggedIn) return false
    if (canEditAnyNote) return true
    return note.createdByUid === userUid
  }
  
  const canDeleteNote = (note) => {
    if (!note || !isLoggedIn) return false
    if (canDeleteNotes) return true
    return note.createdByUid === userUid
  }
  
  // Organize notes into threaded structure (parent notes and replies)
  const organizedNotes = useMemo(() => {
    const parentNotes = notes.filter(n => !n.parentNoteId)
    const replies = notes.filter(n => n.parentNoteId)
    
    const noteMap = new Map()
    parentNotes.forEach(note => {
      noteMap.set(note.id, { ...note, replies: [] })
    })
    
    replies.forEach(reply => {
      const parent = noteMap.get(reply.parentNoteId)
      if (parent) {
        parent.replies.push(reply)
      }
    })
    
    // Sort replies by creation time
    noteMap.forEach(note => {
      note.replies.sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt))
    })
    
    return Array.from(noteMap.values()).sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt))
  }, [notes])

  // Add a new note (or reply)
  async function handleAddNote(e) {
    e.preventDefault()
    if (!isLoggedIn || !current?.id || !newNoteText.trim() || submittingNote) return

    setSubmittingNote(true)
    try {
      const displayName = session?.displayName || session?.username || session?.firstName || 'משתמש'
      await addDoc(collection(db, 'parliamentNotes'), {
        subjectId: current.id,
        text: newNoteText.trim(),
        createdByUid: userUid,
        createdByName: displayName,
        createdAt: serverTimestamp(),
        parentNoteId: null, // Top-level note
      })
      setNewNoteText('')
    } catch (error) {
      console.error('Error adding note:', error)
      alert(t('parliament.noteAddError') || 'שגיאה בהוספת הערה')
    } finally {
      setSubmittingNote(false)
    }
  }

  // Add a reply to a note
  async function handleAddReply(e, parentNoteId) {
    e.preventDefault()
    if (!isLoggedIn || !current?.id || !replyText.trim() || submittingReply || !parentNoteId) return

    setSubmittingReply(true)
    try {
      const displayName = session?.displayName || session?.username || session?.firstName || 'משתמש'
      await addDoc(collection(db, 'parliamentNotes'), {
        subjectId: current.id,
        text: replyText.trim(),
        createdByUid: userUid,
        createdByName: displayName,
        createdAt: serverTimestamp(),
        parentNoteId: parentNoteId,
      })
      setReplyText('')
      setReplyingToNoteId(null)
    } catch (error) {
      console.error('Error adding reply:', error)
      alert(t('parliament.noteAddError') || 'שגיאה בהוספת תגובה')
    } finally {
      setSubmittingReply(false)
    }
  }

  // Start editing a note
  function startEditNote(note) {
    setEditingNoteId(note.id)
    setEditingNoteText(note.text)
  }

  // Cancel editing
  function cancelEditNote() {
    setEditingNoteId(null)
    setEditingNoteText('')
  }

  // Save edited note
  async function handleSaveEdit(noteId) {
    if (!editingNoteText.trim() || !noteId) return

    try {
      await updateDoc(doc(db, 'parliamentNotes', noteId), {
        text: editingNoteText.trim(),
        updatedAt: serverTimestamp(),
      })
      setEditingNoteId(null)
      setEditingNoteText('')
    } catch (error) {
      console.error('Error updating note:', error)
      alert(t('parliament.noteUpdateError') || 'שגיאה בעדכון הערה')
    }
  }

  // Delete a note
  async function handleDeleteNote(noteId) {
    if (!noteId) return
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    
    if (!canDeleteNote(note)) {
      alert(t('parliament.noPermission') || 'אין לך הרשאה למחוק הערה זו')
      return
    }
    
    if (!confirm(t('parliament.deleteConfirmNote') || 'האם אתה בטוח שברצונך למחוק הערה זו?')) return

    try {
      await deleteDoc(doc(db, 'parliamentNotes', noteId))
    } catch (error) {
      console.error('Error deleting note:', error)
      alert(t('parliament.noteDeleteError') || 'שגיאה במחיקת הערה')
    }
  }

  return (
    <div className="parliament-page">
      <div className="parliament-header-row">
        <h2 className="parliament-title">
          {t('parliament.headline') || 'הציעו, סקרו ודונו בנושאי הפרלמנט'}
        </h2>
        <div className="parliament-auth-buttons">
          {isLoggedIn ? (
            <>
              <span className="parliament-user-name">
                {session?.displayName || session?.username || 'משתמש'}
              </span>
              <button className="btn btn-ghost" onClick={handleLogout}>
                {t('parliamentLogin.logout') || 'התנתק'}
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/parliament/login', { state: { from: { pathname: '/parliament' } } })}
            >
              {t('parliamentLogin.loginOrRegister') || 'התחבר / הירשם'}
            </button>
          )}
        </div>
      </div>

      {/* OPEN dates: Approved subjects */}
      <section className="parliament-section">
        <h3 className="parliament-section-title">
          <EditableText translationKey="parliament.approvedSubjects">
            {t('parliament.approvedSubjects') || 'נושאים מאושרים'}
          </EditableText>
        </h3>
        {openGroups.length === 0 ? (
          <div className="parliament-empty">
            <EditableText translationKey="parliament.noApproved">
              {t('parliament.noApproved') || 'אין נושאים מאושרים עדיין.'}
            </EditableText>
          </div>
        ) : (
          openGroups.map(group => (
            <div key={group.date?.id || 'unknown-open'} style={{ marginBottom: '1rem' }}>
              <div className="parliament-section-title">
                {group.date?.title || t('parliament.unknownDate') || 'תאריך לא ידוע'}
              </div>
              <div className="parliament-grid">
                {group.items.map(s => (
                  <div key={s.id} className="parliament-card">
                    <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                      <span className="parliament-badge">{s.dateTitle}</span>
                      <span className="parliament-meta">✅</span>
                    </div>
                    <h3 style={{ margin: '8px 0 6px' }}>{s.title}</h3>
                    <div className="parliament-meta">{s.createdByName}</div>
                    {s.description && (
                      <div className="parliament-pre">{s.description}</div>
                    )}
                    <div className="parliament-actions" style={{ marginTop: 10 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => setCurrent(s)}
                      >
                        💬 {t('parliament.discuss') || 'דיון / הערות'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Submit new subject - students, parents, admins, and managers can submit */}
      {isLoggedIn && (session?.role === 'student' || session?.role === 'parent' || session?.role === 'admin' || session?.role === 'editor' || session?.role === 'committee') ? (
        <section className="parliament-section">
          <SubjectSubmitForm dates={dates} currentUser={user || session} />
        </section>
      ) : (
        <section className="parliament-section">
          <div className="parliament-card">
            <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
              {isLoggedIn ? (
                <EditableText translationKey="parliamentLogin.noPermissionToSubmit">
                  {t('parliamentLogin.noPermissionToSubmit') || 'רק תלמידים, הורים, מנהלים ועורכים יכולים להציע נושאים לפרלמנט'}
                </EditableText>
              ) : (
                <EditableText translationKey="parliamentLogin.loginToSubmit">
                  {t('parliamentLogin.loginToSubmit') || 'עליך להתחבר כדי לשלוח נושאים לפרלמנט'}
                </EditableText>
              )}
            </p>
          </div>
        </section>
      )}

      {/* My pending submissions */}
      {userUid && (
        <section className="parliament-section">
          <h3 className="parliament-section-title">
            <EditableText translationKey="parliament.myPending">
              {t('parliament.myPending') || 'ההצעות שלי הממתינות לאישור'}
            </EditableText>
          </h3>
          {myPending.length === 0 ? (
            <div className="parliament-empty">
              <EditableText translationKey="parliament.noMyPending">
                {t('parliament.noMyPending') || 'אין לך נושאים ממתינים.'}
              </EditableText>
            </div>
          ) : (
            <div className="parliament-grid">
              {myPending.map(p => (
                <div key={p.id} className="parliament-card">
                  <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                    <span className="parliament-badge">{p.dateTitle}</span>
                  </div>
                  <h3 style={{ margin: '8px 0 6px' }}>{p.title}</h3>
                  <div className="parliament-meta">{p.createdByName}</div>
                  <div className="parliament-pre">{p.description}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* My rejected submissions */}
      {userUid && (
        <section className="parliament-section">
          <h3 className="parliament-section-title">
            <EditableText translationKey="parliament.myRejected">
              {t('parliament.myRejected') || 'ההצעות שלי שנדחו'}
            </EditableText>
          </h3>
          {myRejected.length === 0 ? (
            <div className="parliament-empty">
              <EditableText translationKey="parliament.noMyRejected">
                {t('parliament.noMyRejected') || 'אין לך נושאים שנדחו.'}
              </EditableText>
            </div>
          ) : (
            <div className="parliament-grid">
              {myRejected.map(r => (
                <div key={r.id} className="parliament-card">
                  <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                    <span className="parliament-badge">{r.dateTitle}</span>
                  </div>
                  <h3 style={{ margin: '8px 0 6px' }}>{r.title}</h3>
                  <div className="parliament-meta">{r.createdByName}</div>
                  {r.statusReason && (
                    <div className="parliament-meta" style={{ marginTop: '8px' }}>
                      {t('parliament.rejectedReason') || 'סיבה'}: {r.statusReason}
                    </div>
                  )}
                  <div className="parliament-pre">{r.description}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CLOSED dates */}
      <section className="parliament-section">
        <h3 className="parliament-section-title">
          <EditableText translationKey="parliament.closedSectionTitle">
            {t('parliament.closedSectionTitle') || 'תאריכים סגורים'}
          </EditableText>
        </h3>
        {closedGroups.length === 0 ? (
          <div className="parliament-empty">
            <EditableText translationKey="parliament.noClosed">
              {t('parliament.noClosed') || 'אין תאריכים סגורים עדיין.'}
            </EditableText>
          </div>
        ) : (
          closedGroups.map(group => (
            <div key={group.date?.id || 'unknown-closed'} style={{ marginBottom: '1rem' }}>
              <div className="parliament-section-title">
                {group.date?.title || t('parliament.unknownDate') || 'תאריך לא ידוע'}
              </div>
              <div className="parliament-grid">
                {group.items.map(s => (
                  <div key={s.id} className="parliament-card">
                    <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                      <span className="parliament-badge">{s.dateTitle}</span>
                    </div>
                    <h3 style={{ margin: '8px 0 6px' }}>{s.title}</h3>
                    <div className="parliament-meta">{s.createdByName}</div>
                    {s.description && (
                      <div className="parliament-pre">{s.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Popup modal for notes */}
      {current && (
        <div
          className="parliament-modal-backdrop"
          onClick={() => setCurrent(null)}
        >
          <div
            className="parliament-modal-panel"
            onClick={e => e.stopPropagation()}
          >
            <div className="parliament-section">
              <div className="parliament-modal-header">
                <h3 style={{ margin: 0 }}>{current.title}</h3>
                <button className="btn btn-ghost" onClick={() => setCurrent(null)}>
                  ✖
                </button>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <span className="parliament-badge">{current.dateTitle}</span>
              </div>
              {current.description && (
                <div className="parliament-pre" style={{ marginTop: '1rem' }}>
                  {current.description}
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <div className="parliament-card">
                <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                  <div className="parliament-section-title" style={{ margin: 0 }}>
                    {t('parliament.notes') || 'הערות'}
                  </div>
                </div>

                {/* Notes list */}
                {organizedNotes.length === 0 ? (
                  <div className="parliament-empty">
                    {t('parliament.noNotes') || 'אין הערות עדיין. היה הראשון להגיב.'}
                  </div>
                ) : (
                  <div className="parliament-notes-list" style={{ marginTop: '1rem' }}>
                    {organizedNotes.map(note => (
                      <div key={note.id} className="parliament-note-item">
                        <div className="parliament-row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div className="parliament-meta" style={{ fontWeight: 600 }}>
                            {note.createdByName || 'משתמש'}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div className="parliament-meta" style={{ fontSize: '0.85rem' }}>
                              {note.createdAt?.toDate ? 
                                new Date(note.createdAt.toDate()).toLocaleString('he-IL') :
                                note.createdAt ? 
                                  new Date(note.createdAt).toLocaleString('he-IL') :
                                  ''
                              }
                            </div>
                            {canEditNote(note) && editingNoteId !== note.id && (
                              <button
                                className="btn btn-ghost"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                                onClick={() => startEditNote(note)}
                                title={t('parliament.editNote') || 'ערוך הערה'}
                              >
                                ✏️
                              </button>
                            )}
                            {canDeleteNote(note) && (
                              <button
                                className="btn btn-warn"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                                onClick={() => handleDeleteNote(note.id)}
                                title={t('parliament.deleteNote') || 'מחק הערה'}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {editingNoteId === note.id ? (
                          <div style={{ marginTop: '0.5rem' }}>
                            <textarea
                              value={editingNoteText}
                              onChange={e => setEditingNoteText(e.target.value)}
                              rows={3}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '2px solid var(--primary-color)',
                                borderRadius: '5px',
                                fontFamily: 'inherit',
                                fontSize: '1rem',
                                resize: 'vertical'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-ghost"
                                onClick={cancelEditNote}
                                style={{ fontSize: '0.9rem' }}
                              >
                                {t('common.cancel') || 'ביטול'}
                              </button>
                              <button
                                className="btn btn-primary"
                                onClick={() => handleSaveEdit(note.id)}
                                disabled={!editingNoteText.trim()}
                                style={{ fontSize: '0.9rem' }}
                              >
                                {t('common.save') || 'שמור'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '0.5rem' }}>
                            {note.text}
                          </div>
                        )}
                        
                        {/* Reply button */}
                        {isLoggedIn && editingNoteId !== note.id && (
                          <div style={{ marginTop: '0.5rem' }}>
                            {replyingToNoteId === note.id ? (
                              <form onSubmit={(e) => handleAddReply(e, note.id)} style={{ marginTop: '0.5rem' }}>
                                <textarea
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  placeholder={t('parliament.replyPlaceholder') || 'כתוב תגובה...'}
                                  rows={2}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '2px solid var(--border-color)',
                                    borderRadius: '5px',
                                    fontFamily: 'inherit',
                                    fontSize: '0.9rem',
                                    resize: 'vertical'
                                  }}
                                  disabled={submittingReply}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => {
                                      setReplyingToNoteId(null)
                                      setReplyText('')
                                    }}
                                    style={{ fontSize: '0.85rem' }}
                                  >
                                    {t('common.cancel') || 'ביטול'}
                                  </button>
                                  <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={!replyText.trim() || submittingReply}
                                    style={{ fontSize: '0.85rem' }}
                                  >
                                    {submittingReply ? (t('parliament.submitting') || 'שולח...') : (t('parliament.reply') || 'השב')}
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                className="btn btn-ghost"
                                onClick={() => setReplyingToNoteId(note.id)}
                                style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                              >
                                💬 {t('parliament.reply') || 'השב'}
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Replies */}
                        {note.replies && note.replies.length > 0 && (
                          <div className="parliament-replies" style={{ marginTop: '1rem', marginRight: '1.5rem', borderRight: '2px solid var(--border-color)', paddingRight: '1rem' }}>
                            {note.replies.map(reply => (
                              <div key={reply.id} className="parliament-note-item" style={{ marginBottom: '0.75rem', marginTop: '0.75rem' }}>
                                <div className="parliament-row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                  <div className="parliament-meta" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {reply.createdByName || 'משתמש'}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <div className="parliament-meta" style={{ fontSize: '0.75rem' }}>
                                      {reply.createdAt?.toDate ? 
                                        new Date(reply.createdAt.toDate()).toLocaleString('he-IL') :
                                        reply.createdAt ? 
                                          new Date(reply.createdAt).toLocaleString('he-IL') :
                                          ''
                                      }
                                    </div>
                                    {canEditNote(reply) && editingNoteId !== reply.id && (
                                      <button
                                        className="btn btn-ghost"
                                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                        onClick={() => startEditNote(reply)}
                                        title={t('parliament.editNote') || 'ערוך הערה'}
                                      >
                                        ✏️
                                      </button>
                                    )}
                                    {canDeleteNote(reply) && (
                                      <button
                                        className="btn btn-warn"
                                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                        onClick={() => handleDeleteNote(reply.id)}
                                        title={t('parliament.deleteNote') || 'מחק הערה'}
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {editingNoteId === reply.id ? (
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <textarea
                                      value={editingNoteText}
                                      onChange={e => setEditingNoteText(e.target.value)}
                                      rows={2}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '2px solid var(--primary-color)',
                                        borderRadius: '5px',
                                        fontFamily: 'inherit',
                                        fontSize: '0.9rem',
                                        resize: 'vertical'
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                                      <button
                                        className="btn btn-ghost"
                                        onClick={cancelEditNote}
                                        style={{ fontSize: '0.85rem' }}
                                      >
                                        {t('common.cancel') || 'ביטול'}
                                      </button>
                                      <button
                                        className="btn btn-primary"
                                        onClick={() => handleSaveEdit(reply.id)}
                                        disabled={!editingNoteText.trim()}
                                        style={{ fontSize: '0.85rem' }}
                                      >
                                        {t('common.save') || 'שמור'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '0.9rem' }}>
                                    {reply.text}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add note form - only for logged-in users */}
                {isLoggedIn ? (
                  <form onSubmit={handleAddNote} style={{ marginTop: '1rem' }}>
                    <textarea
                      value={newNoteText}
                      onChange={e => setNewNoteText(e.target.value)}
                      placeholder={t('parliament.addNotePlaceholder') || 'הוסף הערה...'}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        resize: 'vertical'
                      }}
                      disabled={submittingNote}
                    />
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!newNoteText.trim() || submittingNote}
                      >
                        {submittingNote ? (t('parliament.submitting') || 'שולח...') : (t('parliament.addNote') || 'הוסף הערה')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ marginTop: '1rem', textAlign: 'center', padding: '1rem', color: '#666' }}>
                    {t('parliament.loginToAddNote') || 'עליך להתחבר כדי להוסיף הערות'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
