import { useEffect, useMemo, useState, useRef } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '../services/firebase'
import { useTranslation } from '../contexts/TranslationContext'
import './Parliament.css'

export default function ParliamentAdmin() {
  const { t } = useTranslation()
  const [dates, setDates] = useState([])
  const [pending, setPending] = useState([])
  const [approved, setApproved] = useState([])
  const [rejected, setRejected] = useState([])
  const [tab, setTab] = useState('queue')
  
  // Modal states
  const [showCreateDateModal, setShowCreateDateModal] = useState(false)
  const [newDateTitle, setNewDateTitle] = useState('')
  const [newDateWhen, setNewDateWhen] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [subjectToReject, setSubjectToReject] = useState(null)

  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}') || {}
    } catch {
      return {}
    }
  }, [])
  const user = session?.user || session

  // Use polling instead of real-time for dates to reduce DB connections
  const datesLoadedRef = useRef(false)
  useEffect(() => {
    const loadDates = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'parliamentDates'), orderBy('date', 'asc')))
        setDates(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        datesLoadedRef.current = true
      } catch (error) {
        console.error('Error loading dates:', error)
      }
    }
    
    loadDates()
    // Refresh every 30 seconds instead of real-time
    const interval = setInterval(loadDates, 30000)
    return () => clearInterval(interval)
  }, [])

  // Helper function to convert timestamp to milliseconds
  function tsMillis(x) {
    if (!x) return 0
    if (typeof x?.toMillis === 'function') return x.toMillis()
    const d = x instanceof Date ? x : new Date(x)
    const t = d.getTime()
    return Number.isFinite(t) ? t : 0
  }

  // Use polling instead of 3 separate real-time listeners to reduce DB connections
  // Load all subjects once and filter client-side, or use a single query with refresh
  const subjectsLoadedRef = useRef(false)
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        // Load all subjects in one query, then filter client-side
        // This reduces from 3 separate queries to 1 query
        const snap = await getDocs(query(collection(db, 'parliamentSubjects')))
        const allSubjects = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        
        // Filter and sort client-side
        const pendingList = allSubjects.filter(s => s.status === 'pending')
        const approvedList = allSubjects.filter(s => s.status === 'approved')
        const rejectedList = allSubjects.filter(s => s.status === 'rejected')
        
        const sortFn = (a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)
        pendingList.sort(sortFn)
        approvedList.sort(sortFn)
        rejectedList.sort(sortFn)
        
        setPending(pendingList)
        setApproved(approvedList)
        setRejected(rejectedList)
        subjectsLoadedRef.current = true
      } catch (error) {
        console.error('Error loading subjects:', error)
      }
    }
    
    loadSubjects()
    // Refresh every 15 seconds instead of real-time (admin page can tolerate slight delay)
    const interval = setInterval(loadSubjects, 15000)
    return () => clearInterval(interval)
  }, [])

  function openCreateDateModal() {
    setNewDateTitle('')
    setNewDateWhen('')
    setShowCreateDateModal(true)
  }

  async function createDate() {
    if (!newDateTitle.trim() || !newDateWhen.trim()) return
    
    try {
      await addDoc(collection(db, 'parliamentDates'), {
        title: newDateTitle.trim(),
        date: new Date(newDateWhen),
        isOpen: true,
        createdAt: serverTimestamp(),
        createdByUid: user?.uid || '',
        createdByName: user?.displayName || user?.username || 'Admin',
      })
      setShowCreateDateModal(false)
      setNewDateTitle('')
      setNewDateWhen('')
    } catch (error) {
      console.error('Error creating date:', error)
      alert(t('parliament.createDateError') || 'שגיאה ביצירת תאריך')
    }
  }

  async function toggleDate(d) {
    await updateDoc(doc(db, 'parliamentDates', d.id), { isOpen: !d.isOpen })
  }

  async function deleteDate(d) {
    if (
      !confirm(
        t('parliament.confirmDeleteDate') ||
          'למחוק תאריך זה? זה לא ימחק נושאים.'
      )
    )
      return
    await deleteDoc(doc(db, 'parliamentDates', d.id))
  }

  async function approve(s) {
    await updateDoc(doc(db, 'parliamentSubjects', s.id), {
      status: 'approved',
      statusReason: '',
    })
  }

  function openRejectModal(s) {
    setSubjectToReject(s)
    setRejectReason('')
    setShowRejectModal(true)
  }

  async function reject() {
    if (!subjectToReject || !rejectReason.trim()) return
    
    try {
      await updateDoc(doc(db, 'parliamentSubjects', subjectToReject.id), {
        status: 'rejected',
        statusReason: rejectReason.trim(),
      })
      setShowRejectModal(false)
      setRejectReason('')
      setSubjectToReject(null)
    } catch (error) {
      console.error('Error rejecting subject:', error)
      alert(t('parliament.rejectError') || 'שגיאה בדחיית נושא')
    }
  }

  function renderList(list) {
    if (list.length === 0)
      return (
        <div className="parliament-card">
          {t('parliament.empty') || 'ריק'}
        </div>
      )
    return (
      <div className="parliament-grid">
        {list.map(s => (
          <div key={s.id} className="parliament-card">
            <div
              className="parliament-row"
              style={{ justifyContent: 'space-between' }}
            >
              <div>
                <span className="parliament-badge">{s.dateTitle}</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                {s.createdByName}
              </div>
            </div>
            <h3 style={{ margin: '8px 0 6px' }}>{s.title}</h3>
            <div style={{ whiteSpace: 'pre-wrap' }}>{s.description}</div>

            <div className="parliament-actions" style={{ marginTop: 12 }}>
              {s.status === 'pending' && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => approve(s)}
                  >
                    {t('parliament.approve') || 'אשר'}
                  </button>
                  <button
                    className="btn btn-warn"
                    onClick={() => openRejectModal(s)}
                  >
                    {t('parliament.reject') || 'דחה'}
                  </button>
                </>
              )}
              {s.status !== 'pending' && (
                <>
                  <button
                    className="btn btn-ghost"
                    onClick={() => approve(s)}
                  >
                    {t('parliament.markApproved') || 'סמן כמאושר'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => openRejectModal(s)}
                  >
                    {t('parliament.markRejected') || 'סמן כדחוי'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="parliament-page">
      <h1 className="parliament-title">
        {t('parliament.adminTitle') || 'ניהול פרלמנט'}
      </h1>

      <div className="parliament-toolbar">
        <button
          className={`btn ${tab === 'queue' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('queue')}
        >
          {t('parliament.queue') || 'תור לאישור'}
        </button>
        <button
          className={`btn ${tab === 'approved' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('approved')}
        >
          {t('parliament.approved') || 'מאושרים'}
        </button>
        <button
          className={`btn ${tab === 'rejected' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('rejected')}
        >
          {t('parliament.rejected') || 'נדחו'}
        </button>
        <button
          className={`btn ${tab === 'dates' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('dates')}
        >
          {t('parliament.dates') || 'תאריכים'}
        </button>
      </div>

      {tab === 'queue' && (
        <section className="parliament-section">
          <h3>{t('parliament.queue') || 'תור לאישור'}</h3>
          {renderList(pending)}
        </section>
      )}

      {tab === 'approved' && (
        <section className="parliament-section">
          <h3>{t('parliament.approved') || 'מאושרים'}</h3>
          {renderList(approved)}
        </section>
      )}

      {tab === 'rejected' && (
        <section className="parliament-section">
          <h3>{t('parliament.rejected') || 'נדחו'}</h3>
          {renderList(rejected)}
        </section>
      )}

      {tab === 'dates' && (
        <section className="parliament-section">
          <div className="parliament-actions" style={{ marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={openCreateDateModal}>
              {t('parliament.createDate') || 'צור תאריך'}
            </button>
          </div>
          <div className="parliament-grid">
            {dates.map(d => (
              <div className="parliament-card" key={d.id}>
                <div
                  className="parliament-row"
                  style={{ justifyContent: 'space-between' }}
                >
                  <div style={{ fontWeight: 700 }}>{d.title}</div>
                  <div className="parliament-badge">
                    {d.isOpen
                      ? t('parliament.open') || 'פתוח'
                      : t('parliament.closed') || 'סגור'}
                  </div>
                </div>
                <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
                  {new Date(d.date?.toDate?.() || d.date).toLocaleDateString()}
                </div>
                <div className="parliament-actions" style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => toggleDate(d)}
                  >
                    {d.isOpen
                      ? t('parliament.close') || 'סגור'
                      : t('parliament.reopen') || 'פתח מחדש'}
                  </button>
                  <button
                    className="btn btn-warn"
                    onClick={() => deleteDate(d)}
                  >
                    {t('parliament.delete') || 'מחק'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Create Date Modal */}
      {showCreateDateModal && (
        <div className="parliament-modal-backdrop" onClick={() => setShowCreateDateModal(false)}>
          <div className="parliament-modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{t('parliament.createDate') || 'צור תאריך'}</h3>
            <div className="parliament-form-group" style={{ marginTop: '1rem' }}>
              <label>{t('parliament.newDateTitle') || 'כותרת לתאריך הפרלמנט החדש'}</label>
              <input
                type="text"
                value={newDateTitle}
                onChange={(e) => setNewDateTitle(e.target.value)}
                placeholder={t('parliament.newDateTitlePlaceholder') || 'למשל: "פרלמנט – 15 ספטמבר"'}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              />
            </div>
            <div className="parliament-form-group" style={{ marginTop: '1rem' }}>
              <label>{t('parliament.newDateWhen') || 'תאריך'}</label>
              <input
                type="date"
                value={newDateWhen}
                onChange={(e) => setNewDateWhen(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              />
            </div>
            <div className="parliament-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateDateModal(false)}>
                {t('common.cancel') || 'ביטול'}
              </button>
              <button className="btn btn-primary" onClick={createDate} disabled={!newDateTitle.trim() || !newDateWhen.trim()}>
                {t('common.create') || 'צור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="parliament-modal-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="parliament-modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{t('parliament.reject') || 'דחה נושא'}</h3>
            <div className="parliament-form-group" style={{ marginTop: '1rem' }}>
              <label>{t('parliament.rejectReason') || 'סיבת הדחייה'}</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('parliament.rejectReasonPlaceholder') || 'הכנס סיבה לדחייה...'}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', minHeight: '100px' }}
              />
            </div>
            <div className="parliament-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)}>
                {t('common.cancel') || 'ביטול'}
              </button>
              <button className="btn btn-warn" onClick={reject} disabled={!rejectReason.trim()}>
                {t('parliament.reject') || 'דחה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
