import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB } from '../services/firebaseDB'
import { getSectionsArrays } from '../utils/sectionsUtils'
import './SectionEditor.css'

const GenericSectionEditor = ({ sectionIndex, onClose, onSave }) => {
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
      const { sectionsHe, sectionsEn } = getSectionsArrays(translations)

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
      const { sectionsHe, sectionsEn } = getSectionsArrays(translations)

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
        newSection.imageKey = `section.image${imageIndex + 1}`
        newSectionEn.imageKey = `section.image${imageIndex + 1}`
      }

      // Validate
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
      translations.he.sections = sectionsHe
      translations.en.sections = sectionsEn

      // Save to localStorage
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
      await reloadTranslations()

      if (onSave) {
        onSave()
      }

      onClose()
    } catch (error) {
      console.error('Error saving section:', error)
      setSaveMessage('שגיאה בשמירה: ' + (error.message || 'שגיאה לא ידועה'))
    } finally {
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

export default GenericSectionEditor
