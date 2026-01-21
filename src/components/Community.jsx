import { useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import SectionEditor from './SectionEditor'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB } from '../services/firebaseDB'
import './Community.css'

const Community = () => {
  const { t, reloadTranslations } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [editingIndex, setEditingIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Get sections from translations, fallback to old structure
  const sections = t('community.sections')
  const hasOldStructure = (!sections || !Array.isArray(sections) || sections.length === 0) && t('community.text')
  const displaySections = (Array.isArray(sections) && sections.length > 0) ? sections : (hasOldStructure ? [{ text: t('community.text') }] : [])

  const handleDelete = async (index) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק סעיף זה?')) {
      return
    }

    try {
      const translations = await getTranslations(true)
      const sections = translations.he?.community?.sections || []
      const sectionsEn = translations.en?.community?.sections || []

      sections.splice(index, 1)
      sectionsEn.splice(index, 1)

      translations.he.community = translations.he.community || {}
      translations.en.community = translations.en.community || {}
      translations.he.community.sections = sections
      translations.en.community.sections = sectionsEn

      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)

      clearTranslationsCache()
      await reloadTranslations()
    } catch (error) {
      console.error('Error deleting section:', error)
      alert('שגיאה במחיקת הסעיף')
    }
  }

  const handleMoveUp = async (index) => {
    if (index === 0) return

    try {
      const translations = await getTranslations(true)
      const sections = translations.he?.community?.sections || []
      const sectionsEn = translations.en?.community?.sections || []

      const temp = sections[index]
      sections[index] = sections[index - 1]
      sections[index - 1] = temp

      const tempEn = sectionsEn[index]
      sectionsEn[index] = sectionsEn[index - 1]
      sectionsEn[index - 1] = tempEn

      translations.he.community = translations.he.community || {}
      translations.en.community = translations.en.community || {}
      translations.he.community.sections = sections
      translations.en.community.sections = sectionsEn

      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)

      clearTranslationsCache()
      await reloadTranslations()
    } catch (error) {
      console.error('Error moving section up:', error)
      alert('שגיאה בשינוי סדר הסעיף')
    }
  }

  const handleMoveDown = async (index) => {
    if (index === displaySections.length - 1) return

    try {
      const translations = await getTranslations(true)
      const sections = translations.he?.community?.sections || []
      const sectionsEn = translations.en?.community?.sections || []

      const temp = sections[index]
      sections[index] = sections[index + 1]
      sections[index + 1] = temp

      const tempEn = sectionsEn[index]
      sectionsEn[index] = sectionsEn[index + 1]
      sectionsEn[index + 1] = tempEn

      translations.he.community = translations.he.community || {}
      translations.en.community = translations.en.community || {}
      translations.he.community.sections = sections
      translations.en.community.sections = sectionsEn

      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)

      clearTranslationsCache()
      await reloadTranslations()
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
    <section id="community" className="community">
      <div className="container">
        <div className="community-content">
          <h2 className="section-title">
            <EditableText translationKey="community.title">
              {t('community.title')}
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
            const sectionId = `community-section-${index}`
            return (
              <div key={index} id={sectionId} className="community-section">
                <div className="community-text">
                  {section.title && (
                    <h3>
                      <EditableText translationKey={`community.sections.${index}.title`}>
                        {section.title}
                      </EditableText>
                    </h3>
                  )}
                  <p>
                    <EditableText translationKey={`community.sections.${index}.text`}>
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
                  <div className="community-image">
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
              sectionKey="community"
              sectionIndex={editingIndex}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
          {showAddModal && (
            <SectionEditor
              sectionKey="community"
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

export default Community
