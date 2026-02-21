import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { useEffectiveRole, UserRole } from '../utils/requireRole'
import DocumentHead from '../components/DocumentHead'
import EditableText from '../components/EditableText'
import SubjectSubmitForm from '../components/parliament/SubjectSubmitForm'
import {
  loadParliamentDates,
  loadParliamentSubjects,
  subscribeToUserParliamentSubjects,
  loadParliamentNotes,
  createParliamentNote,
  updateParliamentNote,
  deleteParliamentNote,
} from '../services/firebaseDB'
import './Parliament.css'

function tsMillis(x) {
  if (!x) return 0
  if (typeof x?.toMillis === 'function') return x.toMillis()
  const d = x instanceof Date ? x : new Date(x)
  const t = d.getTime()
  return Number.isFinite(t) ? t : 0
}

function formatParliamentDate(dateObj) {
  if (!dateObj) return ''
  try {
    let date
    if (dateObj?.toDate && typeof dateObj.toDate === 'function') {
      date = dateObj.toDate()
    } else if (dateObj instanceof Date) {
      date = dateObj
    } else {
      date = new Date(dateObj)
    }
    
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      return ''
    }
    
    return date.toLocaleDateString('he-IL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  } catch {
    return ''
  }
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

  const datesLoadedRef = useRef(false)
  useEffect(() => {
    if (datesLoadedRef.current) return
    datesLoadedRef.current = true
    
    const loadDates = async () => {
      try {
        // Use 10-second cache for more live updates
        const list = await loadParliamentDates(false, 10000)
        // Ensure isOpen is a boolean
        const processedList = list.map(d => ({
          ...d,
          isOpen: d.isOpen !== false && d.isOpen !== 'false' // Default to true if not explicitly false
        }))
        processedList.sort((a, b) => tsMillis(a.date) - tsMillis(b.date))
        setDates(processedList)
      } catch (error) {
        datesLoadedRef.current = false
      }
    }
    
    loadDates()
    
    // Reduced interval from 30s to 10s for more responsive updates
    const interval = setInterval(loadDates, 10000)
    return () => {
      clearInterval(interval)
      datesLoadedRef.current = false
    }
  }, [])

  const subjectsLoadedRef = useRef(false)
  useEffect(() => {
    if (subjectsLoadedRef.current) return
    subjectsLoadedRef.current = true
    
    const loadSubjects = async () => {
      try {
        // Use 10-second cache for more live updates
        const list = await loadParliamentSubjects('approved', false, 10000)
        list.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt))
        setSubjects(list)
      } catch (error) {
        subjectsLoadedRef.current = false
      }
    }
    
    loadSubjects()
    
    // Reduced interval from 30s to 10s for more responsive updates
    const interval = setInterval(loadSubjects, 10000)
    return () => {
      clearInterval(interval)
      subjectsLoadedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!userUid) return
    
    const unsub = subscribeToUserParliamentSubjects(userUid, (mine) => {
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
    })
    
    return () => unsub()
  }, [userUid])

  const notesLoadedRef = useRef(false)
  useEffect(() => {
    if (!current?.id) {
      setNotes([])
      notesLoadedRef.current = false
      return
    }

    const loadNotes = async () => {
      try {
        // Use 10-second cache for more live updates
        const list = await loadParliamentNotes(current.id, false, 10000)
        list.sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt))
        setNotes(list)
        notesLoadedRef.current = true
      } catch (error) {
      }
    }
    
    loadNotes()
    
    // Reduced interval from 10s to 5s for notes (more frequent updates)
    const interval = setInterval(loadNotes, 5000)
    return () => clearInterval(interval)
  }, [current?.id])

  const dateMap = useMemo(() => {
    const map = new Map()
    dates.forEach(d => {
      map.set(d.id, d)
    })
    return map
  }, [dates])

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

  const sessionRole = session?.role || ''
  const effectiveRole = userRole || sessionRole
  const canDeleteNotes = effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.COMMITTEE
  const canEditAnyNote = effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.COMMITTEE
  
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
    
    noteMap.forEach(note => {
      note.replies.sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt))
    })
    
    return Array.from(noteMap.values()).sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt))
  }, [notes])

  async function handleAddNote(e) {
    e.preventDefault()
    if (!isLoggedIn || !current?.id || !newNoteText.trim() || submittingNote) return

    setSubmittingNote(true)
    try {
      const displayName = session?.displayName || session?.username || session?.firstName || 'משתמש'
      await createParliamentNote({
        subjectId: current.id,
        text: newNoteText.trim(),
        createdByUid: userUid,
        createdByName: displayName,
        parentNoteId: null,
      })
      setNewNoteText('')
    } catch (error) {
      alert(t('parliament.noteAddError') || 'שגיאה בהוספת הערה')
    } finally {
      setSubmittingNote(false)
    }
  }

  async function handleAddReply(e, parentNoteId) {
    e.preventDefault()
    if (!isLoggedIn || !current?.id || !replyText.trim() || submittingReply || !parentNoteId) return

    setSubmittingReply(true)
    try {
      const displayName = session?.displayName || session?.username || session?.firstName || 'משתמש'
      await createParliamentNote({
        subjectId: current.id,
        text: replyText.trim(),
        createdByUid: userUid,
        createdByName: displayName,
        parentNoteId: parentNoteId,
      })
      setReplyText('')
      setReplyingToNoteId(null)
    } catch (error) {
      alert(t('parliament.noteAddError') || 'שגיאה בהוספת תגובה')
    } finally {
      setSubmittingReply(false)
    }
  }

  function startEditNote(note) {
    setEditingNoteId(note.id)
    setEditingNoteText(note.text)
  }

  function cancelEditNote() {
    setEditingNoteId(null)
    setEditingNoteText('')
  }

  async function handleSaveEdit(noteId) {
    if (!editingNoteText.trim() || !noteId || !current?.id) return

    try {
      await updateParliamentNote(noteId, editingNoteText.trim(), current.id)
      setEditingNoteId(null)
      setEditingNoteText('')
    } catch (error) {
      alert(t('parliament.noteUpdateError') || 'שגיאה בעדכון הערה')
    }
  }

  async function handleDeleteNote(noteId) {
    if (!noteId || !current?.id) return
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    
    if (!canDeleteNote(note)) {
      alert(t('parliament.noPermission') || 'אין לך הרשאה למחוק הערה זו')
      return
    }
    
    if (!confirm(t('parliament.deleteConfirmNote') || 'האם אתה בטוח שברצונך למחוק הערה זו?')) return

    try {
      await deleteParliamentNote(noteId, current.id)
    } catch (error) {
      alert(t('parliament.noteDeleteError') || 'שגיאה במחיקת הערה')
    }
  }

  return (
    <div className="parliament-page">
      <DocumentHead
        title={t('meta.parliamentTitle')}
        description={t('meta.parliamentDescription')}
        canonicalPath="/parliament"
      />
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
                {group.date?.date && (
                  <span style={{ fontSize: '0.9em', opacity: 0.8, marginRight: '0.5rem', fontWeight: 400 }}>
                    {' - ' + formatParliamentDate(group.date.date)}
                  </span>
                )}
              </div>
              <div className="parliament-grid">
                {group.items.map(s => {
                  const subjectDate = dateMap.get(s.dateId)
                  return (
                    <div key={s.id} className="parliament-card">
                      <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                        <span className="parliament-badge">
                          {s.dateTitle}
                          {subjectDate?.date && (
                            <span style={{ marginRight: '0.5rem', opacity: 0.9 }}>
                              {' - ' + formatParliamentDate(subjectDate.date)}
                            </span>
                          )}
                        </span>
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
                  )
                })}
              </div>
            </div>
          ))
        )}
      </section>

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
              {myPending.map(p => {
                const subjectDate = dateMap.get(p.dateId)
                return (
                  <div key={p.id} className="parliament-card">
                    <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                      <span className="parliament-badge">
                        {p.dateTitle}
                        {subjectDate?.date && (
                          <span style={{ marginRight: '0.5rem', opacity: 0.9 }}>
                            {' - ' + formatParliamentDate(subjectDate.date)}
                          </span>
                        )}
                      </span>
                    </div>
                    <h3 style={{ margin: '8px 0 6px' }}>{p.title}</h3>
                    <div className="parliament-meta">{p.createdByName}</div>
                    <div className="parliament-pre">{p.description}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

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
              {myRejected.map(r => {
                const subjectDate = dateMap.get(r.dateId)
                return (
                  <div key={r.id} className="parliament-card">
                    <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                      <span className="parliament-badge">
                        {r.dateTitle}
                        {subjectDate?.date && (
                          <span style={{ marginRight: '0.5rem', opacity: 0.9 }}>
                            {' - ' + formatParliamentDate(subjectDate.date)}
                          </span>
                        )}
                      </span>
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
                )
              })}
            </div>
          )}
        </section>
      )}

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
                {group.date?.date && (
                  <span style={{ fontSize: '0.9em', opacity: 0.8, marginRight: '0.5rem', fontWeight: 400 }}>
                    {' - ' + formatParliamentDate(group.date.date)}
                  </span>
                )}
              </div>
              <div className="parliament-grid">
                {group.items.map(s => {
                  const subjectDate = dateMap.get(s.dateId)
                  return (
                    <div key={s.id} className="parliament-card">
                      <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                        <span className="parliament-badge">
                          {s.dateTitle}
                          {subjectDate?.date && (
                            <span style={{ marginRight: '0.5rem', opacity: 0.9 }}>
                              {' - ' + formatParliamentDate(subjectDate.date)}
                            </span>
                          )}
                        </span>
                      </div>
                      <h3 style={{ margin: '8px 0 6px' }}>{s.title}</h3>
                      <div className="parliament-meta">{s.createdByName}</div>
                      {s.description && (
                        <div className="parliament-pre">{s.description}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </section>

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
                <span className="parliament-badge">
                  {current.dateTitle}
                  {(() => {
                    if (!current.dateId) return null
                    const subjectDate = dateMap.get(current.dateId)
                    if (!subjectDate?.date) return null
                    return (
                      <span style={{ marginRight: '0.5rem', opacity: 0.9 }}>
                        {' - ' + formatParliamentDate(subjectDate.date)}
                      </span>
                    )
                  })()}
                </span>
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
