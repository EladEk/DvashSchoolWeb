import { useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import SectionEditor from './SectionEditor'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB } from '../services/firebaseDB'
import './Authorities.css'

const Authorities = () => {
  const { t, reloadTranslations } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [editingIndex, setEditingIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Get sections from translations, fallback to old structure
  const sections = t('authorities.sections')
  const oldText = t('authorities.text')
  // Only show old structure if sections is empty AND old text exists and is not empty
  const hasOldStructure = (!sections || !Array.isArray(sections) || sections.length === 0) && oldText && oldText.trim() !== ''
  const displaySections = (Array.isArray(sections) && sections.length > 0) ? sections : (hasOldStructure ? [{ text: oldText }] : [])

  const handleDelete = async (index) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק סעיף זה?')) {
      return
    }

    try {
      const translations = await getTranslations(true)
      
      // Ensure sections exist and are arrays
      if (!translations.he.authorities) translations.he.authorities = {}
      if (!translations.en.authorities) translations.en.authorities = {}
      
      let sections = Array.isArray(translations.he.authorities.sections) ? [...translations.he.authorities.sections] : []
      let sectionsEn = Array.isArray(translations.en.authorities.sections) ? [...translations.en.authorities.sections] : []

      // Determine what we're actually displaying vs what's in stored translations
      // If displaySections has 1 item but sections array is empty, we're showing old structure
      const isShowingOldStructure = displaySections.length === 1 && sections.length === 0 && index === 0

      // Handle deletion
      if (isShowingOldStructure) {
        // We're displaying old structure (1 item from old text) and user clicked delete on index 0
        // Explicitly set text to null/undefined and delete the property to override defaults
        // This ensures the old text won't show after save/reload and displaySections will be empty
        delete translations.he.authorities.text
        delete translations.en.authorities.text
        translations.he.authorities.sections = []
        translations.en.authorities.sections = []
        // Also explicitly set to null to ensure it's cleared
        translations.he.authorities.text = null
        translations.en.authorities.text = null
      } else if (index >= 0 && index < sections.length) {
        // Normal case: remove section from array
        sections.splice(index, 1)
        sectionsEn.splice(index, 1)
        translations.he.authorities.sections = sections
        translations.en.authorities.sections = sectionsEn
      } else {
        // Invalid index - provide helpful error message
        console.error('Invalid index for deletion:', {
          index,
          sectionsLength: sections.length,
          displaySectionsLength: displaySections.length,
          hasOldStructure
        })
        alert(`שגיאה: אינדקס לא תקין. אינדקס: ${index}, מספר סעיפים בשמירה: ${sections.length}, מספר סעיפים בתצוגה: ${displaySections.length}`)
        return
      }

      // Save to localStorage and Firebase
      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)

      // Clear cache and reload (force Firebase reload to get latest data)
      clearTranslationsCache()
      await reloadTranslations(true) // force Firebase reload
    } catch (error) {
      console.error('Error deleting section:', error)
      alert('שגיאה במחיקת הסעיף: ' + error.message)
    }
  }

  const handleMoveUp = async (index) => {
    if (index === 0) return

    try {
      const translations = await getTranslations(true)
      const sections = translations.he?.authorities?.sections || []
      const sectionsEn = translations.en?.authorities?.sections || []

      const temp = sections[index]
      sections[index] = sections[index - 1]
      sections[index - 1] = temp

      const tempEn = sectionsEn[index]
      sectionsEn[index] = sectionsEn[index - 1]
      sectionsEn[index - 1] = tempEn

      translations.he.authorities = translations.he.authorities || {}
      translations.en.authorities = translations.en.authorities || {}
      translations.he.authorities.sections = sections
      translations.en.authorities.sections = sectionsEn

      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)

      clearTranslationsCache()
      await reloadTranslations(true) // force Firebase reload
    } catch (error) {
      console.error('Error moving section up:', error)
      alert('שגיאה בשינוי סדר הסעיף')
    }
  }

  const handleMoveDown = async (index) => {
    if (index === displaySections.length - 1) return

    try {
      const translations = await getTranslations(true)
      const sections = translations.he?.authorities?.sections || []
      const sectionsEn = translations.en?.authorities?.sections || []

      const temp = sections[index]
      sections[index] = sections[index + 1]
      sections[index + 1] = temp

      const tempEn = sectionsEn[index]
      sectionsEn[index] = sectionsEn[index + 1]
      sectionsEn[index + 1] = tempEn

      translations.he.authorities = translations.he.authorities || {}
      translations.en.authorities = translations.en.authorities || {}
      translations.he.authorities.sections = sections
      translations.en.authorities.sections = sectionsEn

      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)

      clearTranslationsCache()
      await reloadTranslations(true) // force Firebase reload
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

  return (
    <section id="authorities" className="authorities">
      <div className="container">
        <div className="authorities-content">
          <h2 className="section-title">
            <EditableText translationKey="authorities.title">
              {t('authorities.title')}
            </EditableText>
            {isAdminMode && (
              <button 
                className="section-add-btn" 
                onClick={() => setShowAddModal(true)}
                title="הוסף סעיף חדש"
              >
                + הוסף סעיף
              </button>
            )}
          </h2>
          {displaySections.map((section, index) => {
            const hasImage = !!section.imageKey
            const sectionId = `authorities-section-${index}`
            return (
              <div key={index} id={sectionId} className="authorities-section">
                <div className="authorities-text">
                  {section.title && (
                    <h3>
                      <EditableText translationKey={`authorities.sections.${index}.title`}>
                        {section.title}
                      </EditableText>
                    </h3>
                  )}
                  <p>
                    <EditableText translationKey={`authorities.sections.${index}.text`}>
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
                        disabled={index === displaySections.length - 1}
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
                  <div className="authorities-image">
                    <EditableImage imageKey={section.imageKey} alt={section.imageKey} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {isAdminMode && (
        <>
          {editingIndex !== null && (
            <SectionEditor
              sectionKey="authorities"
              sectionIndex={editingIndex}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
          {showAddModal && (
            <SectionEditor
              sectionKey="authorities"
              sectionIndex={null}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
        </>
      )}
    </section>
  )
}

export default Authorities
