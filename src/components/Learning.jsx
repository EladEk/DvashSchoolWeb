import { useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import SectionEditor from './SectionEditor'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB } from '../services/firebaseDB'
import './Learning.css'

const Learning = () => {
  const { t, reloadTranslations } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [editingIndex, setEditingIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Get sections from translations, fallback to old structure
  const sections = t('learning.sections')
  const hasOldStructure = (!sections || !Array.isArray(sections) || sections.length === 0) && t('learning.text')
  const displaySections = (Array.isArray(sections) && sections.length > 0) ? sections : (hasOldStructure ? [{ text: t('learning.text') }] : [])

  const handleDelete = async (index) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק סעיף זה?')) {
      return
    }

    try {
      const translations = await getTranslations(true)
      
      // Ensure sections exist and are arrays
      if (!translations.he.learning) translations.he.learning = {}
      if (!translations.en.learning) translations.en.learning = {}
      
      const sections = Array.isArray(translations.he.learning.sections) ? [...translations.he.learning.sections] : []
      const sectionsEn = Array.isArray(translations.en.learning.sections) ? [...translations.en.learning.sections] : []

      // Validate index
      if (index < 0 || index >= sections.length) {
        console.error('Invalid index for deletion:', index, 'sections length:', sections.length)
        alert('שגיאה: אינדקס לא תקין')
        return
      }

      // Remove the section at the specified index
      sections.splice(index, 1)
      sectionsEn.splice(index, 1)

      // Update translations
      translations.he.learning.sections = sections
      translations.en.learning.sections = sectionsEn

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
      const sections = translations.he?.learning?.sections || []
      const sectionsEn = translations.en?.learning?.sections || []

      const temp = sections[index]
      sections[index] = sections[index - 1]
      sections[index - 1] = temp

      const tempEn = sectionsEn[index]
      sectionsEn[index] = sectionsEn[index - 1]
      sectionsEn[index - 1] = tempEn

      translations.he.learning = translations.he.learning || {}
      translations.en.learning = translations.en.learning || {}
      translations.he.learning.sections = sections
      translations.en.learning.sections = sectionsEn

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
      const sections = translations.he?.learning?.sections || []
      const sectionsEn = translations.en?.learning?.sections || []

      const temp = sections[index]
      sections[index] = sections[index + 1]
      sections[index + 1] = temp

      const tempEn = sectionsEn[index]
      sectionsEn[index] = sectionsEn[index + 1]
      sectionsEn[index + 1] = tempEn

      translations.he.learning = translations.he.learning || {}
      translations.en.learning = translations.en.learning || {}
      translations.he.learning.sections = sections
      translations.en.learning.sections = sectionsEn

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
    <section id="learning" className="learning">
      <div className="container">
        <div className="learning-content">
          <h2 className="section-title">
            <EditableText translationKey="learning.title">
              {t('learning.title')}
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
            const sectionId = `learning-section-${index}`
            return (
              <div key={index} id={sectionId} className="learning-section">
                <div className="learning-text">
                  {section.title && (
                    <h3>
                      <EditableText translationKey={`learning.sections.${index}.title`}>
                        {section.title}
                      </EditableText>
                    </h3>
                  )}
                  <p>
                    <EditableText translationKey={`learning.sections.${index}.text`}>
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
                  <div className="learning-image">
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
              sectionKey="learning"
              sectionIndex={editingIndex}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
          {showAddModal && (
            <SectionEditor
              sectionKey="learning"
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

export default Learning
