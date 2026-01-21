import { useState, useMemo } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useTranslation } from '../../contexts/TranslationContext'
import './Parliament.css'

function emailLocalPart(email) {
  if (!email || typeof email !== 'string') return undefined
  const local = email.split('@')[0]
  return local || undefined
}

function pickUsername(u) {
  if (!u) return undefined
  if (u.username && String(u.username).trim()) return String(u.username).trim()
  if (u.user?.username && String(u.user.username).trim()) return String(u.user.username).trim()
  return emailLocalPart(u.email || u.user?.email)
}

function fullNameFromUser(u) {
  if (!u) return 'User'
  const fn = u.firstName || u.given_name || u.user?.firstName || u.user?.given_name
  const ln = u.lastName || u.family_name || u.user?.lastName || u.user?.family_name
  const parts = [fn, ln].map(p => (p ? String(p).trim() : '')).filter(Boolean)
  if (parts.length) return parts.join(' ')
  const single =
    u.fullName || u.name || u.displayName ||
    u.user?.fullName || u.user?.name || u.user?.displayName
  if (single && String(single).trim()) return String(single).trim()
  const uname = pickUsername(u)
  return uname || 'User'
}

export default function SubjectSubmitForm({ dates, currentUser }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [dateId, setDateId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const openDates = useMemo(() => {
    // Filter dates that are open (check for true, 'true', or undefined/null which defaults to open)
    const filtered = dates.filter(d => {
      const isOpen = d.isOpen
      // If isOpen is explicitly false, exclude it. Otherwise include it (true, undefined, null all mean open)
      const result = isOpen !== false && isOpen !== 'false'
      console.log(`SubjectSubmitForm - date ${d.id} (${d.title}): isOpen=${isOpen}, result=${result}`)
      return result
    })
    console.log('SubjectSubmitForm - all dates:', dates.map(d => ({ id: d.id, title: d.title, isOpen: d.isOpen })))
    console.log('SubjectSubmitForm - openDates:', filtered.map(d => ({ id: d.id, title: d.title })))
    return filtered
  }, [dates])

  const uid =
    currentUser?.uid ||
    currentUser?.id ||
    currentUser?.user?.uid ||
    ''

  const displayName = fullNameFromUser(currentUser)

  async function onSubmit(e) {
    e.preventDefault()
    if (!uid || !dateId || !title.trim() || submitting) return

    const date = openDates.find(d => d.id === dateId)
    if (!date) return

    setSubmitting(true)
    try {
      await addDoc(collection(db, 'parliamentSubjects'), {
        title: title.trim(),
        description: desc.trim(),
        createdByUid: uid,
        createdByName: displayName,
        createdByFullName: displayName,
        createdAt: serverTimestamp(),
        status: 'pending',
        dateId,
        dateTitle: date?.title || '',
        notesCount: 0,
      })
      setTitle('')
      setDesc('')
      setDateId('')
      alert(t('parliament.submitted') || 'נשלח לאישור!')
    } catch (error) {
      console.error('Error submitting subject:', error)
      alert(t('parliament.submitError') || 'שגיאה בשליחת הנושא')
    } finally {
      setSubmitting(false)
    }
  }

  if (openDates.length === 0) {
    return (
      <div className="parliament-card">
        {t('parliament.noOpenDates') || 'אין תאריכי פרלמנט פתוחים כרגע.'}
      </div>
    )
  }

  return (
    <form className="parliament-card" onSubmit={onSubmit}>
      <div className="parliament-row">
        <div style={{ flex: 1 }}>
          <label>{t('parliament.subjectTitle') || 'כותרת הנושא'}</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            required
            disabled={submitting}
          />
        </div>
        <div style={{ width: 280 }}>
          <label>{t('parliament.chooseDate') || 'בחר תאריך'}</label>
          <select
            value={dateId}
            onChange={e => setDateId(e.target.value)}
            required
            disabled={submitting}
          >
            <option value="">{t('parliament.select') || 'בחר...'}</option>
            {openDates.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>
      </div>
      <label>{t('parliament.description') || 'תיאור'}</label>
      <textarea
        rows={4}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        disabled={submitting}
      />
      <div className="parliament-actions">
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? (t('parliament.submitting') || 'שולח...') : (t('parliament.submit') || 'שלח')}
        </button>
      </div>
    </form>
  )
}
