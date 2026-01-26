import { useState, useMemo } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import { createParliamentSubject } from '../../services/firebaseDB'
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
      return isOpen !== false && isOpen !== 'false'
    })
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
    if (!date) {
      alert(t('parliament.dateNotOpen') || 'התאריך שנבחר כבר לא פתוח להצעות')
      return
    }

    // Double-check that the date is still open (race condition protection)
    if (date.isOpen === false || date.isOpen === 'false') {
      alert(t('parliament.dateNotOpen') || 'התאריך שנבחר כבר לא פתוח להצעות')
      return
    }

    setSubmitting(true)
    try {
      await createParliamentSubject({
        title: title.trim(),
        description: desc.trim(),
        createdByUid: uid,
        createdByName: displayName,
        dateId,
        dateTitle: date?.title || '',
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
            {openDates.map(d => {
              const dateStr = formatParliamentDate(d.date)
              return (
                <option key={d.id} value={d.id}>
                  {d.title}{dateStr ? ` - ${dateStr}` : ''}
                </option>
              )
            })}
          </select>
        </div>
      </div>
      <label>{t('parliament.description') || 'תיאור'}</label>
      <textarea
        rows={4}
        value={desc}
        onChange={e => setDesc(e.target.value)}
        maxLength={2000}
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
