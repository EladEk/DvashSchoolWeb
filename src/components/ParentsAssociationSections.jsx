import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB, saveImagePathToDB } from '../services/firebaseDB'
import { ensureSectionsArray, getSectionsArraysFor } from '../utils/sectionsUtils'
import './About.css' // Reuse About styles for now
import './GenericSections.css'
import './SectionEditor.css'

const SECTION_KEY = 'parentsAssociationSections'

async function migrateParentsAssociationSectionsToNumeric(getTranslations, saveTranslations, saveAllTranslationsToDB, clearTranslationsCache, reloadTranslations) {
  const translations = await getTranslations(true)
  const heSections = translations.he?.[SECTION_KEY]
  const enSections = translations.en?.[SECTION_KEY]
  if (!heSections || typeof heSections !== 'object') return false
  const keys = Object.keys(heSections)
  const hasNonNumeric = keys.some((k) => !/^\d+$/.test(k))
  if (!hasNonNumeric) return false

  const order = [...keys].sort((a, b) => {
    const posA = heSections[a]?.position ?? 999
    const posB = heSections[b]?.position ?? 999
    return posA - posB
  })
  const newHe = order.map((k, i) => ({ ...heSections[k], position: i }))
  const newEn = order.map((k, i) => ({ ...(enSections?.[k] || {}), position: i }))
  translations.he[SECTION_KEY] = newHe
  translations.en[SECTION_KEY] = newEn
  await saveTranslations(translations, false)
  await saveAllTranslationsToDB(translations)
  clearTranslationsCache()
  await reloadTranslations(true)
  return true
}

const ParentsAssociationSections = () => {
  const { t, reloadTranslations } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [editingIndex, setEditingIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingIndex, setDeletingIndex] = useState(null)
  const migratedRef = useRef(false)

  const rawSections = t(SECTION_KEY)
  const sortedSections = ensureSectionsArray(rawSections)

  useEffect(() => {
    if (migratedRef.current) return
    migratedRef.current = true
    migrateParentsAssociationSectionsToNumeric(getTranslations, saveTranslations, saveAllTranslationsToDB, clearTranslationsCache, reloadTranslations).catch(() => {})
  }, [])

  const handleDelete = async (index) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק סעיף זה?')) {
      return
    }
    setDeletingIndex(index)
    try {
      const translations = await getTranslations(true)
      const { sectionsHe, sectionsEn } = getSectionsArraysFor(translations, SECTION_KEY)
      if (index < 0 || index >= sectionsHe.length) {
        alert('שגיאה: אינדקס לא תקין')
        return
      }
      const sectionToDelete = sectionsHe[index]
      const imageKey = sectionToDelete?.imageKey
      if (imageKey) {
        try {
          await saveImagePathToDB(imageKey, null)
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(`image_${imageKey}`)
          }
        } catch (imgErr) {
          console.warn('Could not clear section image from storage:', imgErr)
        }
      }
      sectionsHe.splice(index, 1)
      sectionsEn.splice(index, 1)
      sectionsHe.forEach((s, i) => { s.position = i })
      sectionsEn.forEach((s, i) => { s.position = i })
      translations.he[SECTION_KEY] = sectionsHe
      translations.en[SECTION_KEY] = sectionsEn
      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)
      clearTranslationsCache()
      await reloadTranslations(true)
    } catch (error) {
      console.error('Error deleting section:', error)
      alert('שגיאה במחיקת הסעיף: ' + error.message)
    } finally {
      setDeletingIndex(null)
    }
  }

  const handleMoveUp = async (index) => {
    if (index === 0) return
    try {
      const translations = await getTranslations(true)
      const { sectionsHe, sectionsEn } = getSectionsArraysFor(translations, SECTION_KEY)
      const tempHe = sectionsHe[index]
      const tempEn = sectionsEn[index]
      sectionsHe[index] = sectionsHe[index - 1]
      sectionsHe[index - 1] = tempHe
      sectionsEn[index] = sectionsEn[index - 1]
      sectionsEn[index - 1] = tempEn
      sectionsHe.forEach((s, i) => { s.position = i })
      sectionsEn.forEach((s, i) => { s.position = i })
      translations.he[SECTION_KEY] = sectionsHe
      translations.en[SECTION_KEY] = sectionsEn
      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)
      clearTranslationsCache()
      await reloadTranslations(true)
    } catch (error) {
      console.error('Error moving section up:', error)
      alert('שגיאה בשינוי סדר הסעיף')
    }
  }

  const handleMoveDown = async (index) => {
    if (index >= sortedSections.length - 1) return
    try {
      const translations = await getTranslations(true)
      const { sectionsHe, sectionsEn } = getSectionsArraysFor(translations, SECTION_KEY)
      const tempHe = sectionsHe[index]
      const tempEn = sectionsEn[index]
      sectionsHe[index] = sectionsHe[index + 1]
      sectionsHe[index + 1] = tempHe
      sectionsEn[index] = sectionsEn[index + 1]
      sectionsEn[index + 1] = tempEn
      sectionsHe.forEach((s, i) => { s.position = i })
      sectionsEn.forEach((s, i) => { s.position = i })
      translations.he[SECTION_KEY] = sectionsHe
      translations.en[SECTION_KEY] = sectionsEn
      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)
      clearTranslationsCache()
      await reloadTranslations(true)
    } catch (error) {
      console.error('Error moving section down:', error)
      alert('שגיאה בשינוי סדר הסעיף')
    }
  }

  const handleEditorClose = () => {
    setEditingIndex(null)
    setShowAddModal(false)
  }

  const handleEditorSave = () => {
    reloadTranslations()
  }

  if (sortedSections.length === 0 && !isAdminMode) {
    return null
  }

  return (
    <>
      {deletingIndex !== null && (
        <div className="action-loader-overlay" role="status" aria-live="polite">
          <div className="action-loader-spinner" aria-hidden />
          <p>{t('common.deleting') || 'מוחק...'}</p>
        </div>
      )}
      {sortedSections.map((section, index) => {
        const hasImage = !!section.imageKey
        const sectionId = `parents-association-section-${index}`
        const isReverse = index % 2 === 1
        
        return (
          <section key={sectionId} id={sectionId} className="about">
            <div className="container">
              <div className="section-title-wrapper">
                <h2 className="section-title">
                  <EditableText translationKey={`parentsAssociationSections.${index}.title`}>
                    {section.title || 'כותרת'}
                  </EditableText>
                </h2>
                <hr className="section-title-divider" />
              </div>
              <div className={`about-item ${isReverse ? 'about-item-reverse' : ''}`}>
                <div className="about-text">
                  <p>
                    <EditableText translationKey={`parentsAssociationSections.${index}.text`}>
                      {section.text}
                    </EditableText>
                  </p>
                  {isAdminMode && (
                    <div className="section-actions">
                      <button 
                        className="section-move-up-btn" 
                        onClick={() => handleMoveUp(index)}
                        title="הזז למעלה"
                        disabled={index === 0}
                      >
                        ⬆️ למעלה
                      </button>
                      <button 
                        className="section-move-down-btn" 
                        onClick={() => handleMoveDown(index)}
                        title="הזז למטה"
                        disabled={index === sortedSections.length - 1}
                      >
                        ⬇️ למטה
                      </button>
                      <button 
                        className="section-edit-btn" 
                        onClick={() => setEditingIndex(index)}
                        title="ערוך סעיף"
                      >
                        ✏️ ערוך
                      </button>
                      <button 
                        className="section-delete-btn" 
                        onClick={() => handleDelete(index)}
                        title="מחק סעיף"
                      >
                        🗑️ מחק
                      </button>
                    </div>
                  )}
                </div>
                {hasImage && (
                  <div className="about-image">
                    <EditableImage imageKey={section.imageKey} alt={section.imageKey} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )
      })}
      {isAdminMode && (
        <>
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <button 
              className="section-add-btn" 
              onClick={() => setShowAddModal(true)}
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', background: 'var(--gradient-primary)', color: 'var(--text-on-primary)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 600 }}
            >
              + הוסף סעיף חדש
            </button>
          </div>
          {editingIndex !== null && (
            <ParentsAssociationSectionEditor
              sectionIndex={editingIndex}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
          {showAddModal && (
            <ParentsAssociationSectionEditor
              sectionIndex={null}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
        </>
      )}
    </>
  )
}

// Separate editor component for Parents Association sections
const ParentsAssociationSectionEditor = ({ sectionIndex, onClose, onSave }) => {
  const { t, reloadTranslations } = useTranslation()
  const [hebrewTitle, setHebrewTitle] = useState('')
  const [hebrewText, setHebrewText] = useState('')
  const [englishTitle, setEnglishTitle] = useState('')
  const [englishText, setEnglishText] = useState('')
  const [hasImage, setHasImage] = useState(false)
  const [position, setPosition] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const modalRef = useRef(null)

  useEffect(() => {
    loadSectionData()
  }, [sectionIndex])

  const loadSectionData = async () => {
    try {
      setLoading(true)
      const translations = await getTranslations(true)
      const { sectionsHe, sectionsEn } = getSectionsArraysFor(translations, SECTION_KEY)

      if (sectionIndex !== null && sectionIndex >= 0 && sectionIndex < sectionsHe.length) {
        const section = sectionsHe[sectionIndex]
        const sectionEn = sectionsEn[sectionIndex] || {}
        setHebrewTitle(section?.title || '')
        setHebrewText(section?.text || '')
        setEnglishTitle(sectionEn?.title || '')
        setEnglishText(sectionEn?.text || '')
        setHasImage(!!section?.imageKey)
        setPosition(sectionIndex)
      } else if (sectionIndex !== null && sectionIndex >= 0) {
        setHebrewTitle('')
        setHebrewText('')
        setEnglishTitle('')
        setEnglishText('')
        setHasImage(false)
        setPosition(sectionsHe.length)
      } else {
        setHebrewTitle('')
        setHebrewText('')
        setEnglishTitle('')
        setEnglishText('')
        setHasImage(false)
        setPosition(sectionsHe.length)
      }
    } catch (error) {
      console.error('Error loading section data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    await new Promise((r) => setTimeout(r, 0))

    try {
      const translations = await getTranslations(true)
      const { sectionsHe, sectionsEn } = getSectionsArraysFor(translations, SECTION_KEY)

      const newSection = {
        title: hebrewTitle.trim(),
        text: hebrewText.trim(),
        position: position
      }
      const newSectionEn = {
        title: englishTitle.trim(),
        text: englishText.trim(),
        position: position
      }

      if (hasImage) {
        const imageIndex = sectionIndex !== null && sectionIndex >= 0 ? sectionIndex : sectionsHe.length
        newSection.imageKey = `parentsAssociationSections.image${imageIndex + 1}`
        newSectionEn.imageKey = `parentsAssociationSections.image${imageIndex + 1}`
      }

      if (!newSection.title || !newSection.title.trim()) {
        setSaveMessage('שגיאה: יש למלא כותרת בעברית (נדרש לניווט)')
        setSaving(false)
        return
      }

      if (!newSection.text) {
        setSaveMessage('שגיאה: יש למלא טקסט בעברית')
        setSaving(false)
        return
      }

      if (!newSectionEn.text) {
        setSaveMessage('שגיאה: יש למלא טקסט באנגלית')
        setSaving(false)
        return
      }

      if (sectionIndex !== null && sectionIndex >= 0 && sectionIndex < sectionsHe.length) {
        sectionsHe[sectionIndex] = newSection
        sectionsEn[sectionIndex] = newSectionEn
      } else {
        sectionsHe.push(newSection)
        sectionsEn.push(newSectionEn)
      }

      sectionsHe.forEach((s, i) => { s.position = i })
      sectionsEn.forEach((s, i) => { s.position = i })
      translations.he[SECTION_KEY] = sectionsHe
      translations.en[SECTION_KEY] = sectionsEn

      await saveTranslations(translations, false)

      // Save to Firebase
      try {
        await saveAllTranslationsToDB(translations)
      } catch (firebaseError) {
        console.error('❌ Error saving section to Firebase:', firebaseError)
        setSaveMessage('נשמר מקומית, אך שגיאה ב-Firebase: ' + (firebaseError.message || 'שגיאה לא ידועה'))
        setTimeout(() => {
          setSaveMessage('')
        }, 3000)
      }

      // Reload translations
      clearTranslationsCache()
      await reloadTranslations(true)

      if (onSave) {
        onSave()
      }

      onClose()
    } catch (error) {
      console.error('Error saving section:', error)
      setSaveMessage('שגיאה בשמירת הסעיף: ' + error.message)
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !saving) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [saving])

  const modalContent = (
    <div className="section-editor-overlay" onClick={handleClose}>
      <div className="section-editor-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        {saving && (
          <div className="section-editor-saving-overlay" aria-hidden="false">
            <div className="action-loader-spinner" />
            <p>{t('common.saving') || 'שומר...'}</p>
          </div>
        )}
        <div className="section-editor-header">
          <h3>
            {sectionIndex !== null ? 'עריכת סעיף' : 'הוספת סעיף חדש'}
          </h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        <div className="section-editor-content">
          {loading ? (
            <div className="loading">טוען...</div>
          ) : (
            <>
              <div className="section-editor-field">
                <label>מיקום (לסדר את הסעיפים)</label>
                <input
                  type="number"
                  value={position}
                  onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
                  min="0"
                  style={{ width: '100px' }}
                />
              </div>
              <div className="section-editor-field">
                <label>
                  <input
                    type="checkbox"
                    checked={hasImage}
                    onChange={(e) => setHasImage(e.target.checked)}
                  />
                  {' '}סעיף עם תמונה
                </label>
              </div>
              <div className="section-editor-field">
                <label>כותרת (עברית) * - נדרש לניווט</label>
                <input
                  type="text"
                  value={hebrewTitle}
                  onChange={(e) => setHebrewTitle(e.target.value)}
                  dir="rtl"
                  placeholder="הזן כותרת בעברית (יופיע בתפריט הניווט)"
                  required
                />
              </div>
              <div className="section-editor-field">
                <label>טקסט (עברית)</label>
                <textarea
                  value={hebrewText}
                  onChange={(e) => setHebrewText(e.target.value)}
                  rows={8}
                  dir="rtl"
                  placeholder="הזן טקסט בעברית"
                />
              </div>
              <div className="section-editor-field">
                <label>Title (English) - Optional</label>
                <input
                  type="text"
                  value={englishTitle}
                  onChange={(e) => setEnglishTitle(e.target.value)}
                  dir="ltr"
                  placeholder="Enter title in English (optional)"
                />
              </div>
              <div className="section-editor-field">
                <label>Text (English)</label>
                <textarea
                  value={englishText}
                  onChange={(e) => setEnglishText(e.target.value)}
                  rows={8}
                  dir="ltr"
                  placeholder="Enter text in English"
                />
              </div>
            </>
          )}
        </div>
        <div className="section-editor-footer">
          <div className="section-editor-actions">
            <button className="cancel-btn" onClick={handleClose} disabled={saving}>
              {t('common.cancel') || 'ביטול'}
            </button>
            <button 
              className="save-btn" 
              onClick={handleSave} 
              disabled={saving || loading}
            >
              {saving ? (t('common.saving') || 'שומר...') : (t('common.save') || 'שמור')}
            </button>
          </div>
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('שגיאה') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default ParentsAssociationSections
