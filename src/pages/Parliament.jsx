import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useTranslation } from '../contexts/TranslationContext'
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
  const [dates, setDates] = useState([])
  const [subjects, setSubjects] = useState([])
  const [myPending, setMyPending] = useState([])
  const [myRejected, setMyRejected] = useState([])
  const [editing, setEditing] = useState(null)
  const [current, setCurrent] = useState(null)

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
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => tsMillis(a.date) - tsMillis(b.date))
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
          {t('parliament.approvedSubjects') || 'נושאים מאושרים'}
        </h3>
        {openGroups.length === 0 ? (
          <div className="parliament-empty">
            {t('parliament.noApproved') || 'אין נושאים מאושרים עדיין.'}
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

      {/* Submit new subject */}
      {isLoggedIn ? (
        <section className="parliament-section">
          <SubjectSubmitForm dates={dates} currentUser={user || session} />
        </section>
      ) : (
        <section className="parliament-section">
          <div className="parliament-card">
            <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
              {t('parliamentLogin.loginToSubmit') || 'עליך להתחבר כדי לשלוח נושאים לפרלמנט'}
            </p>
            <div style={{ textAlign: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/parliament/login', { state: { from: { pathname: '/parliament' } } })}
              >
                {t('parliamentLogin.loginOrRegister') || 'התחבר / הירשם'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* My pending submissions */}
      {userUid && (
        <section className="parliament-section">
          <h3 className="parliament-section-title">
            {t('parliament.myPending') || 'ההצעות שלי הממתינות לאישור'}
          </h3>
          {myPending.length === 0 ? (
            <div className="parliament-empty">
              {t('parliament.noMyPending') || 'אין לך נושאים ממתינים.'}
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
            {t('parliament.myRejected') || 'ההצעות שלי שנדחו'}
          </h3>
          {myRejected.length === 0 ? (
            <div className="parliament-empty">
              {t('parliament.noMyRejected') || 'אין לך נושאים שנדחו.'}
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
          {t('parliament.closedSectionTitle') || 'תאריכים סגורים'}
        </h3>
        {closedGroups.length === 0 ? (
          <div className="parliament-empty">
            {t('parliament.noClosed') || 'אין תאריכים סגורים עדיין.'}
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
                <div className="parliament-empty">
                  {t('parliament.noNotes') || 'אין הערות עדיין. היה הראשון להגיב.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
