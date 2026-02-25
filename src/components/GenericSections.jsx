import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import GenericSectionEditor from './GenericSectionEditor'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB, deleteImageFromDB } from '../services/firebaseDB'
import { ensureSectionsArray, getSectionsArrays } from '../utils/sectionsUtils'
import './About.css' // Reuse About styles for now
import './GenericSections.css'

async function migrateSectionsToNumericIndices(getTranslations, saveTranslations, saveAllTranslationsToDB, clearTranslationsCache, reloadTranslations) {
  const translations = await getTranslations(true)
  const heSections = translations.he?.sections
  const enSections = translations.en?.sections
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
  translations.he.sections = newHe
  translations.en.sections = newEn
  await saveTranslations(translations, false)
  await saveAllTranslationsToDB(translations)
  clearTranslationsCache()
  await reloadTranslations(true)
  return true
}

const GenericSections = () => {
  const { t, reloadTranslations } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [editingIndex, setEditingIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingIndex, setDeletingIndex] = useState(null)
  const migratedRef = useRef(false)

  const rawSections = t('sections')
  const sortedSections = ensureSectionsArray(rawSections)

  useEffect(() => {
    if (migratedRef.current) return
    migratedRef.current = true
    migrateSectionsToNumericIndices(getTranslations, saveTranslations, saveAllTranslationsToDB, clearTranslationsCache, reloadTranslations).catch(() => {})
  }, [])

  const handleDelete = async (index) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק סעיף זה?')) {
      return
    }
    setDeletingIndex(index)

    try {
      const translations = await getTranslations(true)
      const { sectionsHe, sectionsEn } = getSectionsArrays(translations)
      if (index < 0 || index >= sectionsHe.length) {
        alert('שגיאה: אינדקס לא תקין')
        return
      }

      const sectionToDelete = sectionsHe[index]
      const imageKey = sectionToDelete?.imageKey
      if (imageKey) {
        try {
          await deleteImageFromDB(imageKey)
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(`image_${imageKey}`)
          }
        } catch (imgErr) {
          console.warn('Could not delete section image from images list:', imgErr)
        }
      }

      sectionsHe.splice(index, 1)
      sectionsEn.splice(index, 1)
      sectionsHe.forEach((s, i) => { s.position = i })
      sectionsEn.forEach((s, i) => { s.position = i })

      translations.he.sections = sectionsHe
      translations.en.sections = sectionsEn
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
      const { sectionsHe, sectionsEn } = getSectionsArrays(translations)
      const tempHe = sectionsHe[index]
      const tempEn = sectionsEn[index]
      sectionsHe[index] = sectionsHe[index - 1]
      sectionsHe[index - 1] = tempHe
      sectionsEn[index] = sectionsEn[index - 1]
      sectionsEn[index - 1] = tempEn
      sectionsHe.forEach((s, i) => { s.position = i })
      sectionsEn.forEach((s, i) => { s.position = i })
      translations.he.sections = sectionsHe
      translations.en.sections = sectionsEn
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
      const { sectionsHe, sectionsEn } = getSectionsArrays(translations)
      const tempHe = sectionsHe[index]
      const tempEn = sectionsEn[index]
      sectionsHe[index] = sectionsHe[index + 1]
      sectionsHe[index + 1] = tempHe
      sectionsEn[index] = sectionsEn[index + 1]
      sectionsEn[index + 1] = tempEn
      sectionsHe.forEach((s, i) => { s.position = i })
      sectionsEn.forEach((s, i) => { s.position = i })
      translations.he.sections = sectionsHe
      translations.en.sections = sectionsEn
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
        const sectionId = `section-${index}`
        const isReverse = index % 2 === 1
        
        return (
          <section key={sectionId} id={sectionId} className="about">
            <div className="container">
              <div className="section-title-wrapper">
                <h2 className="section-title">
                  <EditableText translationKey={`sections.${index}.title`}>
                    {section.title || 'כותרת'}
                  </EditableText>
                </h2>
                <hr className="section-title-divider" />
              </div>
              <div className={`about-item ${isReverse ? 'about-item-reverse' : ''}`}>
                <div className="about-text">
                  <p>
                    <EditableText translationKey={`sections.${index}.text`}>
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
          {editingIndex !== null && (
            <GenericSectionEditor
              sectionIndex={editingIndex}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
          {showAddModal && (
            <GenericSectionEditor
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

export default GenericSections
