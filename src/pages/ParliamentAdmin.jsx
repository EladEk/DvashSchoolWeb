import { useEffect, useMemo, useState } from 'react'
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

  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}') || {}
    } catch {
      return {}
    }
  }, [])
  const user = session?.user || session

  useEffect(() => {
    const dq = query(collection(db, 'parliamentDates'), orderBy('date', 'asc'))
    return onSnapshot(dq, snap =>
      setDates(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  useEffect(() => {
    const pq = query(
      collection(db, 'parliamentSubjects'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )
    const aq = query(
      collection(db, 'parliamentSubjects'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    )
    const rq = query(
      collection(db, 'parliamentSubjects'),
      where('status', '==', 'rejected'),
      orderBy('createdAt', 'desc')
    )

    const u1 = onSnapshot(pq, s =>
      setPending(s.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    const u2 = onSnapshot(aq, s =>
      setApproved(s.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    const u3 = onSnapshot(rq, s =>
      setRejected(s.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return () => {
      u1()
      u2()
      u3()
    }
  }, [])

  async function createDate() {
    const title = prompt(
      t('parliament.newDateTitle') ||
        'כותרת לתאריך הפרלמנט החדש (למשל: "פרלמנט – 15 ספטמבר")'
    )
    if (!title) return
    const when = prompt(t('parliament.newDateWhen') || 'הכנס תאריך ISO (YYYY-MM-DD)')
    if (!when) return
    await addDoc(collection(db, 'parliamentDates'), {
      title,
      date: new Date(when),
      isOpen: true,
      createdAt: serverTimestamp(),
      createdByUid: user?.uid || '',
      createdByName: user?.displayName || user?.username || 'Admin',
    })
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

  async function reject(s) {
    const reason =
      prompt(t('parliament.rejectReason') || 'סיבת הדחייה:') || ''
    if (!reason.trim()) return
    await updateDoc(doc(db, 'parliamentSubjects', s.id), {
      status: 'rejected',
      statusReason: reason.trim(),
    })
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
                    onClick={() => reject(s)}
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
                    onClick={() => reject(s)}
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
            <button className="btn btn-primary" onClick={createDate}>
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
    </div>
  )
}
