import { useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import GenericSectionEditor from './GenericSectionEditor'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB, saveImagePathToDB } from '../services/firebaseDB'
import './About.css' // Reuse About styles for now
import './GenericSections.css'

const GenericSections = () => {
  const { t, reloadTranslations } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [editingIndex, setEditingIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingIndex, setDeletingIndex] = useState(null)

  // Get generic sections
  const sections = t('sections')
  const displaySections = Array.isArray(sections) && sections.length > 0 ? sections : []

  // Sort by position
  const sortedSections = [...displaySections].sort((a, b) => {
    const posA = a.position !== undefined ? a.position : 999
    const posB = b.position !== undefined ? b.position : 999
    return posA - posB
  })

  const handleDelete = async (index) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק סעיף זה?')) {
      return
    }
    setDeletingIndex(index)

    try {
      const translations = await getTranslations(true)
      const ensureArray = (v) => {
        if (Array.isArray(v)) return [...v]
        if (v && typeof v === 'object') {
          const keys = Object.keys(v).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b))
          if (keys.length) return keys.map((k) => v[k])
        }
        return []
      }
      let sections = ensureArray(translations.he?.sections)
      let sectionsEn = ensureArray(translations.en?.sections)

      // Find the actual index in unsorted array
      const sorted = [...sections].sort((a, b) => {
        const posA = a.position !== undefined ? a.position : 999
        const posB = b.position !== undefined ? b.position : 999
        return posA - posB
      })
      const sectionToDelete = sorted[index]
      const actualIndex = sections.findIndex(s => s === sectionToDelete)

      if (actualIndex < 0 || actualIndex >= sections.length) {
        console.error('Invalid index for deletion:', index, 'sections length:', sections.length)
        alert('שגיאה: אינדקס לא תקין')
        return
      }

      // If the section had an image, remove it from storage so a new section won't show it
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

      // Remove the section
      sections.splice(actualIndex, 1)
      sectionsEn.splice(actualIndex, 1)

      // Update translations
      translations.he.sections = sections
      translations.en.sections = sectionsEn

      // Save to localStorage and Firebase
      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)

      // Clear cache and reload
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
      const ensureArray = (v) => {
        if (Array.isArray(v)) return v
        if (v && typeof v === 'object') {
          const keys = Object.keys(v).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b))
          if (keys.length) return keys.map((k) => v[k])
        }
        return []
      }
      const sections = ensureArray(translations.he?.sections)
      const sectionsEn = ensureArray(translations.en?.sections)

      // Sort to get current order
      const sorted = [...sections].map((s, i) => ({ ...s, originalIndex: i }))
        .sort((a, b) => {
          const posA = a.position !== undefined ? a.position : 999
          const posB = b.position !== undefined ? b.position : 999
          return posA - posB
        })

      const temp = sorted[index]
      sorted[index] = sorted[index - 1]
      sorted[index - 1] = temp

      // Update positions
      sorted.forEach((s, i) => {
        sections[s.originalIndex].position = i
        if (sectionsEn[s.originalIndex]) {
          sectionsEn[s.originalIndex].position = i
        }
      })

      translations.he.sections = sections
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
    if (index === sortedSections.length - 1) return

    try {
      const translations = await getTranslations(true)
      const ensureArray = (v) => {
        if (Array.isArray(v)) return v
        if (v && typeof v === 'object') {
          const keys = Object.keys(v).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b))
          if (keys.length) return keys.map((k) => v[k])
        }
        return []
      }
      const sections = ensureArray(translations.he?.sections)
      const sectionsEn = ensureArray(translations.en?.sections)

      // Sort to get current order
      const sorted = [...sections].map((s, i) => ({ ...s, originalIndex: i }))
        .sort((a, b) => {
          const posA = a.position !== undefined ? a.position : 999
          const posB = b.position !== undefined ? b.position : 999
          return posA - posB
        })

      const temp = sorted[index]
      sorted[index] = sorted[index + 1]
      sorted[index + 1] = temp

      // Update positions
      sorted.forEach((s, i) => {
        sections[s.originalIndex].position = i
        if (sectionsEn[s.originalIndex]) {
          sectionsEn[s.originalIndex].position = i
        }
      })

      translations.he.sections = sections
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

  if (displaySections.length === 0 && !isAdminMode) {
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
