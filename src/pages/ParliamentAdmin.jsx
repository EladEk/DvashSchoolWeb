import { useEffect, useMemo, useState, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from '../contexts/TranslationContext'
import {
  loadParliamentDates,
  createParliamentDate,
  updateParliamentDate,
  toggleParliamentDate,
  deleteParliamentDate,
  archiveParliamentDate,
  loadParliamentSubjects,
  updateParliamentSubjectStatus,
  updateParliamentSubject,
  deleteParliamentSubject,
  loadParliamentHistory,
} from '../services/firebaseDB'
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
  const [showEditDateModal, setShowEditDateModal] = useState(false)
  const [editingDate, setEditingDate] = useState(null)
  const [editDateTitle, setEditDateTitle] = useState('')
  const [editDateWhen, setEditDateWhen] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [subjectToReject, setSubjectToReject] = useState(null)
  const [approvingSubjectId, setApprovingSubjectId] = useState(null)
  const [rejectingSubjectId, setRejectingSubjectId] = useState(null)
  const [creatingDate, setCreatingDate] = useState(false)
  const [updatingDate, setUpdatingDate] = useState(false)
  const [updatingDateId, setUpdatingDateId] = useState(null)
  const [togglingDateId, setTogglingDateId] = useState(null)
  const [archivingDateId, setArchivingDateId] = useState(null)
  const [deletingDateId, setDeletingDateId] = useState(null)
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [editSubjectTitle, setEditSubjectTitle] = useState('')
  const [editSubjectDescription, setEditSubjectDescription] = useState('')
  const [editSubjectDateId, setEditSubjectDateId] = useState('')
  const [updatingSubjectId, setUpdatingSubjectId] = useState(null)
  const [deletingSubjectId, setDeletingSubjectId] = useState(null)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

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
        const datesList = await loadParliamentDates()
        setDates(datesList)
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

  // Helper function to format parliament date
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

  // Create a map of dateId to date object for quick lookup
  const dateMap = useMemo(() => {
    const map = new Map()
    dates.forEach(d => {
      map.set(d.id, d)
    })
    return map
  }, [dates])

  // Use polling instead of 3 separate real-time listeners to reduce DB connections
  // Load all subjects once and filter client-side, or use a single query with refresh
  const subjectsLoadedRef = useRef(false)
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        // Load all subjects in one query, then filter client-side
        // This reduces from 3 separate queries to 1 query
        const allSubjects = await loadParliamentSubjects(null)
        
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

  // Load history only when history tab is selected (lazy loading)
  useEffect(() => {
    if (tab === 'history' && !historyLoaded && !loadingHistory) {
      setLoadingHistory(true)
      loadParliamentHistory()
        .then(data => {
          setHistory(data)
          setLoadingHistory(false)
          setHistoryLoaded(true)
        })
        .catch(error => {
          console.error('Error loading history:', error)
          setLoadingHistory(false)
        })
    }
  }, [tab, historyLoaded, loadingHistory])

  function openCreateDateModal() {
    setNewDateTitle('')
    setNewDateWhen('')
    setShowCreateDateModal(true)
  }

  function openEditDateModal(d) {
    setEditingDate(d)
    setEditDateTitle(d.title || '')
    // Format date for input (YYYY-MM-DD)
    const dateValue = d.date?.toDate ? d.date.toDate() : new Date(d.date)
    const formattedDate = dateValue.toISOString().split('T')[0]
    setEditDateWhen(formattedDate)
    setShowEditDateModal(true)
  }

  async function updateDate() {
    if (!editingDate || !editDateTitle.trim() || !editDateWhen.trim()) return
    
    setUpdatingDate(true)
    try {
      await updateParliamentDate(editingDate.id, {
        title: editDateTitle.trim(),
        date: new Date(editDateWhen),
      })
      setShowEditDateModal(false)
      setEditingDate(null)
      setEditDateTitle('')
      setEditDateWhen('')
    } catch (error) {
      console.error('Error updating date:', error)
      alert(error.message || t('parliament.updateDateError') || 'שגיאה בעדכון תאריך')
    } finally {
      setUpdatingDate(false)
    }
  }

  async function createDate() {
    if (!newDateTitle.trim() || !newDateWhen.trim()) return
    
    setCreatingDate(true)
    try {
      await createParliamentDate({
        title: newDateTitle.trim(),
        date: new Date(newDateWhen),
        isOpen: true,
        createdByUid: user?.uid || '',
        createdByName: user?.displayName || user?.username || 'Admin',
      })
      setShowCreateDateModal(false)
      setNewDateTitle('')
      setNewDateWhen('')
    } catch (error) {
      console.error('Error creating date:', error)
      alert(t('parliament.createDateError') || 'שגיאה ביצירת תאריך')
    } finally {
      setCreatingDate(false)
    }
  }

  async function toggleDate(d) {
    setTogglingDateId(d.id)
    try {
      await toggleParliamentDate(d.id, !d.isOpen)
    } catch (error) {
      console.error('Error toggling date:', error)
      alert(t('parliament.toggleDateError') || 'שגיאה בשינוי סטטוס תאריך')
    } finally {
      setTogglingDateId(null)
    }
  }

  async function archiveDate(d) {
    if (
      !confirm(
        t('parliament.confirmArchiveDate') ||
          'האם אתה בטוח שברצונך להעביר את הפרלמנט הזה להיסטוריה? כל הנושאים וההערות המקושרים אליו יועברו גם כן.'
      )
    )
      return
    setArchivingDateId(d.id)
    try {
      const result = await archiveParliamentDate(d.id)
      alert(
        t('parliament.archiveSuccess') ||
          `הפרלמנט הועבר בהצלחה להיסטוריה. נשמרו: ${result.archivedCount.dates} תאריך, ${result.archivedCount.subjects} נושאים, ${result.archivedCount.notes} הערות.`
      )
    } catch (error) {
      console.error('Error archiving date:', error)
      alert(error.message || t('parliament.archiveDateError') || 'שגיאה בהעברת תאריך להיסטוריה')
    } finally {
      setArchivingDateId(null)
    }
  }

  async function deleteDate(d) {
    if (
      !confirm(
        t('parliament.confirmDeleteDate') ||
          'למחוק תאריך זה? זה לא ימחק נושאים. אם יש נושאים מקושרים, השתמש באפשרות "העבר להיסטוריה".'
      )
    )
      return
    setDeletingDateId(d.id)
    try {
      await deleteParliamentDate(d.id)
      alert(t('parliament.deleteDateSuccess') || 'התאריך נמחק בהצלחה')
    } catch (error) {
      console.error('Error deleting date:', error)
      alert(error.message || t('parliament.deleteDateError') || 'שגיאה במחיקת תאריך')
    } finally {
      setDeletingDateId(null)
    }
  }

  function openEditSubjectModal(s) {
    setEditingSubject(s)
    setEditSubjectTitle(s.title || '')
    setEditSubjectDescription(s.description || '')
    setEditSubjectDateId(s.dateId || '')
    setShowEditSubjectModal(true)
  }

  async function updateSubject() {
    if (!editingSubject || !editSubjectTitle.trim() || !editSubjectDateId.trim()) return
    
    flushSync(() => {
      setUpdatingSubjectId(editingSubject.id)
    })
    
    try {
      const selectedDate = dates.find(d => d.id === editSubjectDateId)
      await updateParliamentSubject(editingSubject.id, {
        title: editSubjectTitle.trim(),
        description: editSubjectDescription.trim(),
        dateId: editSubjectDateId,
        dateTitle: selectedDate?.title || '',
      })
      setShowEditSubjectModal(false)
      setEditingSubject(null)
      setEditSubjectTitle('')
      setEditSubjectDescription('')
      setEditSubjectDateId('')
    } catch (error) {
      console.error('Error updating subject:', error)
      alert(error.message || t('parliament.updateSubjectError') || 'שגיאה בעדכון נושא')
      flushSync(() => {
        setUpdatingSubjectId(null)
      })
    } finally {
      flushSync(() => {
        setUpdatingSubjectId(prev => prev === editingSubject?.id ? null : prev)
      })
    }
  }

  async function deleteSubject(s) {
    if (
      !confirm(
        t('parliament.confirmDeleteSubject') ||
          'האם אתה בטוח שברצונך למחוק נושא זה? כל ההערות המקושרות אליו ימחקו גם כן.'
      )
    )
      return
    
    flushSync(() => {
      setDeletingSubjectId(s.id)
    })
    
    try {
      const result = await deleteParliamentSubject(s.id)
      alert(
        t('parliament.deleteSubjectSuccess') ||
          `הנושא נמחק בהצלחה. נמחקו ${result.deletedNotes} הערות.`
      )
    } catch (error) {
      console.error('Error deleting subject:', error)
      alert(error.message || t('parliament.deleteSubjectError') || 'שגיאה במחיקת נושא')
      flushSync(() => {
        setDeletingSubjectId(null)
      })
    } finally {
      flushSync(() => {
        setDeletingSubjectId(prev => prev === s.id ? null : prev)
      })
    }
  }

  async function approve(s) {
    const subjectId = s.id
    const originalStatus = s.status
    
    // Optimistically remove from current list immediately
    if (originalStatus === 'pending') {
      setPending(prev => prev.filter(item => item.id !== subjectId))
    } else if (originalStatus === 'rejected') {
      setRejected(prev => prev.filter(item => item.id !== subjectId))
    }
    
    // Set loading state immediately and force flush
    flushSync(() => {
      setApprovingSubjectId(subjectId)
    })
    
    try {
      await updateParliamentSubjectStatus(subjectId, 'approved', '')
      // Add to approved list optimistically
      setApproved(prev => [{ ...s, status: 'approved' }, ...prev].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)))
    } catch (error) {
      console.error('Error approving subject:', error)
      alert(t('parliament.approveError') || 'שגיאה באישור נושא')
      // Revert optimistic update on error
      if (originalStatus === 'pending') {
        setPending(prev => [s, ...prev].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)))
      } else if (originalStatus === 'rejected') {
        setRejected(prev => [s, ...prev].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)))
      }
      flushSync(() => {
        setApprovingSubjectId(null)
      })
    } finally {
      // Only clear if still the same subject (in case user clicked multiple times)
      flushSync(() => {
        setApprovingSubjectId(prev => prev === subjectId ? null : prev)
      })
    }
  }

  function openRejectModal(s) {
    setSubjectToReject(s)
    setRejectReason('')
    setShowRejectModal(true)
  }

  async function reject() {
    if (!subjectToReject || !rejectReason.trim()) return
    
    const subjectId = subjectToReject.id
    const originalStatus = subjectToReject.status
    
    // Optimistically remove from current list immediately and force flush
    flushSync(() => {
      if (originalStatus === 'pending') {
        setPending(prev => prev.filter(item => item.id !== subjectId))
      } else if (originalStatus === 'approved') {
        setApproved(prev => prev.filter(item => item.id !== subjectId))
      }
      setRejectingSubjectId(subjectId)
    })
    
    try {
      await updateParliamentSubjectStatus(subjectId, 'rejected', rejectReason.trim())
      setShowRejectModal(false)
      setRejectReason('')
      // Add to rejected list optimistically
      setRejected(prev => [{ ...subjectToReject, status: 'rejected', statusReason: rejectReason.trim() }, ...prev].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)))
      setSubjectToReject(null)
    } catch (error) {
      console.error('Error rejecting subject:', error)
      alert(t('parliament.rejectError') || 'שגיאה בדחיית נושא')
      // Revert optimistic update on error
      flushSync(() => {
        if (originalStatus === 'pending') {
          setPending(prev => [subjectToReject, ...prev].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)))
        } else if (originalStatus === 'approved') {
          setApproved(prev => [subjectToReject, ...prev].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)))
        }
        setRejectingSubjectId(null)
      })
    } finally {
      // Only clear if still the same subject
      flushSync(() => {
        setRejectingSubjectId(prev => prev === subjectId ? null : prev)
      })
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
        {list.map(s => {
          const subjectDate = dateMap.get(s.dateId)
          return (
          <div key={s.id} className="parliament-card">
            <div
              className="parliament-row"
              style={{ justifyContent: 'space-between' }}
            >
              <div>
                <span className="parliament-badge">
                  {s.dateTitle}
                  {subjectDate?.date && (
                    <span style={{ marginRight: '0.5rem', opacity: 0.9 }}>
                      {' - ' + formatParliamentDate(subjectDate.date)}
                    </span>
                  )}
                </span>
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
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                  >
                    {approvingSubjectId === s.id ? (t('parliament.approving') || 'מאשר...') : (t('parliament.approve') || 'אשר')}
                  </button>
                  <button
                    className="btn btn-warn"
                    onClick={() => openRejectModal(s)}
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                  >
                    {t('parliament.reject') || 'דחה'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => openEditSubjectModal(s)}
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {t('parliament.edit') || 'ערוך'}
                  </button>
                  <button
                    className="btn btn-warn"
                    onClick={() => deleteSubject(s)}
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {deletingSubjectId === s.id ? (t('parliament.deleting') || 'מוחק...') : (t('parliament.delete') || 'מחק')}
                  </button>
                </>
              )}
              {s.status === 'approved' && (
                <>
                  <button
                    className="btn btn-ghost"
                    onClick={() => openRejectModal(s)}
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                  >
                    {t('parliament.markRejected') || 'סמן כדחוי'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => openEditSubjectModal(s)}
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {updatingSubjectId === s.id ? (t('parliament.updating') || 'מעדכן...') : (t('parliament.edit') || 'ערוך')}
                  </button>
                  <button
                    className="btn btn-warn"
                    onClick={() => deleteSubject(s)}
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {deletingSubjectId === s.id ? (t('parliament.deleting') || 'מוחק...') : (t('parliament.delete') || 'מחק')}
                  </button>
                </>
              )}
              {s.status === 'rejected' && (
                <>
                  <button
                    className="btn btn-ghost"
                    onClick={() => approve(s)}
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                  >
                    {approvingSubjectId === s.id ? (t('parliament.approving') || 'מאשר...') : (t('parliament.markApproved') || 'סמן כמאושר')}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => openEditSubjectModal(s)}
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {updatingSubjectId === s.id ? (t('parliament.updating') || 'מעדכן...') : (t('parliament.edit') || 'ערוך')}
                  </button>
                  <button
                    className="btn btn-warn"
                    onClick={() => deleteSubject(s)}
                    disabled={approvingSubjectId === s.id || rejectingSubjectId === s.id || updatingSubjectId === s.id || deletingSubjectId === s.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {deletingSubjectId === s.id ? (t('parliament.deleting') || 'מוחק...') : (t('parliament.delete') || 'מחק')}
                  </button>
                </>
              )}
            </div>
          </div>
          )
        })}
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
          {t('parliament.parliaments') || 'פרלמנטים'}
        </button>
        <button
          className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('history')}
        >
          {t('parliament.history') || 'היסטורית פרלמנטים'}
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
              {t('parliament.createNewParliament') || 'יצירת פרלמנט חדש'}
            </button>
          </div>
          <div className="parliament-grid">
            {dates.map(d => (
              <div className="parliament-card" key={d.id}>
                <div
                  className="parliament-row"
                  style={{ justifyContent: 'space-between' }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {d.title}
                    {d.date && (() => {
                      const formattedDate = formatParliamentDate(d.date)
                      return formattedDate ? (
                        <span style={{ fontSize: '0.9em', fontWeight: 400, opacity: 0.8, marginRight: '0.5rem' }}>
                          {' - ' + formattedDate}
                        </span>
                      ) : null
                    })()}
                  </div>
                  <div className="parliament-badge">
                    {d.isOpen
                      ? t('parliament.open') || 'פתוח'
                      : t('parliament.closed') || 'סגור'}
                  </div>
                </div>
                <div className="parliament-actions" style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => toggleDate(d)}
                    disabled={togglingDateId === d.id || archivingDateId === d.id || deletingDateId === d.id}
                  >
                    {togglingDateId === d.id ? (t('parliament.processing') || 'מעבד...') : (d.isOpen ? (t('parliament.close') || 'סגור') : (t('parliament.reopen') || 'פתח מחדש'))}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => openEditDateModal(d)}
                    disabled={togglingDateId === d.id || archivingDateId === d.id || deletingDateId === d.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {t('parliament.edit') || 'ערוך'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => archiveDate(d)}
                    disabled={togglingDateId === d.id || archivingDateId === d.id || deletingDateId === d.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {archivingDateId === d.id ? (t('parliament.archiving') || 'מעביר...') : (t('parliament.archive') || 'העבר להיסטוריה')}
                  </button>
                  <button
                    className="btn btn-warn"
                    onClick={() => deleteDate(d)}
                    disabled={togglingDateId === d.id || archivingDateId === d.id || deletingDateId === d.id}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {deletingDateId === d.id ? (t('parliament.deleting') || 'מוחק...') : (t('parliament.delete') || 'מחק')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'history' && (
        <section className="parliament-section">
          <h3>{t('parliament.history') || 'היסטורית פרלמנטים'}</h3>
          {loadingHistory ? (
            <div className="parliament-card">
              {t('parliament.loading') || 'טוען...'}
            </div>
          ) : history.length === 0 ? (
            <div className="parliament-card">
              {t('parliament.empty') || 'ריק'}
            </div>
          ) : (
            <div className="parliament-grid">
              {history.map(item => (
                <div key={item.id} className="parliament-card">
                  <div className="parliament-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <span className="parliament-badge">
                        {item.type === 'date' ? (t('parliament.date') || 'תאריך') : 
                         item.type === 'subject' ? (t('parliament.subject') || 'נושא') : 
                         (t('parliament.note') || 'הערה')}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>
                      {item.archivedAt?.toDate ? 
                        new Date(item.archivedAt.toDate()).toLocaleDateString('he-IL') : 
                        (item.archivedAt ? new Date(item.archivedAt).toLocaleDateString('he-IL') : '')}
                    </div>
                  </div>
                  {item.type === 'date' && (
                    <>
                      <h3 style={{ margin: '8px 0 6px' }}>{item.title}</h3>
                      {item.date && (
                        <div style={{ opacity: 0.8 }}>
                          {formatParliamentDate(item.date)}
                        </div>
                      )}
                    </>
                  )}
                  {item.type === 'subject' && (
                    <>
                      <h3 style={{ margin: '8px 0 6px' }}>{item.title}</h3>
                      <div style={{ whiteSpace: 'pre-wrap', opacity: 0.8 }}>{item.description}</div>
                      <div style={{ fontSize: 13, opacity: 0.7, marginTop: '0.5rem' }}>
                        {item.createdByName}
                      </div>
                    </>
                  )}
                  {item.type === 'note' && (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{item.text}</div>
                  )}
                </div>
              ))}
            </div>
          )}
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
              <button className="btn btn-ghost" onClick={() => setShowCreateDateModal(false)} disabled={creatingDate}>
                {t('common.cancel') || 'ביטול'}
              </button>
              <button className="btn btn-primary" onClick={createDate} disabled={!newDateTitle.trim() || !newDateWhen.trim() || creatingDate}>
                {creatingDate ? (t('parliament.creating') || 'יוצר...') : (t('common.create') || 'צור')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Date Modal */}
      {showEditDateModal && editingDate && (
        <div className="parliament-modal-backdrop" onClick={() => setShowEditDateModal(false)}>
          <div className="parliament-modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{t('parliament.editDate') || 'ערוך תאריך פרלמנט'}</h3>
            <div className="parliament-form-group" style={{ marginTop: '1rem' }}>
              <label>{t('parliament.newDateTitle') || 'כותרת לתאריך הפרלמנט'}</label>
              <input
                type="text"
                value={editDateTitle}
                onChange={(e) => setEditDateTitle(e.target.value)}
                placeholder={t('parliament.newDateTitlePlaceholder') || 'למשל: "פרלמנט – 15 ספטמבר"'}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              />
            </div>
            <div className="parliament-form-group" style={{ marginTop: '1rem' }}>
              <label>{t('parliament.newDateWhen') || 'תאריך'}</label>
              <input
                type="date"
                value={editDateWhen}
                onChange={(e) => setEditDateWhen(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              />
            </div>
            <div className="parliament-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => {
                setShowEditDateModal(false)
                setEditingDate(null)
                setEditDateTitle('')
                setEditDateWhen('')
              }} disabled={updatingDate}>
                {t('common.cancel') || 'ביטול'}
              </button>
              <button className="btn btn-primary" onClick={updateDate} disabled={!editDateTitle.trim() || !editDateWhen.trim() || updatingDate}>
                {updatingDate ? (t('parliament.updating') || 'מעדכן...') : (t('common.save') || 'שמור')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && editingSubject && (
        <div className="parliament-modal-backdrop" onClick={() => setShowEditSubjectModal(false)}>
          <div className="parliament-modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{t('parliament.editSubject') || 'ערוך נושא'}</h3>
            <div className="parliament-form-group" style={{ marginTop: '1rem' }}>
              <label>{t('parliament.subjectTitle') || 'כותרת הנושא'}</label>
              <input
                type="text"
                value={editSubjectTitle}
                onChange={(e) => setEditSubjectTitle(e.target.value)}
                placeholder={t('parliament.subjectTitle') || 'כותרת הנושא'}
                maxLength={120}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              />
            </div>
            <div className="parliament-form-group" style={{ marginTop: '1rem' }}>
              <label>{t('parliament.chooseDate') || 'בחר תאריך'}</label>
              <select
                value={editSubjectDateId}
                onChange={(e) => setEditSubjectDateId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              >
                <option value="">{t('parliament.select') || 'בחר...'}</option>
                {dates.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.title}{d.date ? (' - ' + formatParliamentDate(d.date)) : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="parliament-form-group" style={{ marginTop: '1rem' }}>
              <label>{t('parliament.description') || 'תיאור'}</label>
              <textarea
                value={editSubjectDescription}
                onChange={(e) => setEditSubjectDescription(e.target.value)}
                placeholder={t('parliament.description') || 'תיאור'}
                rows={4}
                maxLength={2000}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              />
            </div>
            <div className="parliament-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => {
                setShowEditSubjectModal(false)
                setEditingSubject(null)
                setEditSubjectTitle('')
                setEditSubjectDescription('')
                setEditSubjectDateId('')
              }} disabled={updatingSubjectId === editingSubject?.id}>
                {t('common.cancel') || 'ביטול'}
              </button>
              <button className="btn btn-primary" onClick={updateSubject} disabled={!editSubjectTitle.trim() || !editSubjectDateId.trim() || updatingSubjectId === editingSubject?.id}>
                {updatingSubjectId === editingSubject?.id ? (t('parliament.updating') || 'מעדכן...') : (t('common.save') || 'שמור')}
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
              <button className="btn btn-ghost" onClick={() => setShowRejectModal(false)} disabled={rejectingSubjectId === subjectToReject?.id}>
                {t('common.cancel') || 'ביטול'}
              </button>
              <button className="btn btn-warn" onClick={reject} disabled={!rejectReason.trim() || rejectingSubjectId === subjectToReject?.id}>
                {rejectingSubjectId === subjectToReject?.id ? (t('parliament.rejecting') || 'דוחה...') : (t('parliament.reject') || 'דחה')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
