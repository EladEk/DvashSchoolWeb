import { useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import SectionEditor from './SectionEditor'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB } from '../services/firebaseDB'
import './About.css'

const About = () => {
  const { t, reloadTranslations } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [editingIndex, setEditingIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Get sections from translations, fallback to old structure for backward compatibility
  const sections = t('about.sections')
  const hasOldStructure = (!sections || !Array.isArray(sections) || sections.length === 0) && (t('about.text1') || t('about.background'))

  // Convert old structure to new if needed (for display only, not saved)
  const displaySections = (Array.isArray(sections) && sections.length > 0) ? sections : (hasOldStructure ? [
    { title: t('about.background'), text: t('about.text1'), imageKey: 'about.image1' },
    { text: t('about.text2'), imageKey: 'about.image2' },
    { text: t('about.text3') || '', imageKey: 'about.image3' }
  ].filter(s => s && s.text) : [])

  const handleDelete = async (index) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק סעיף זה?')) {
      return
    }

    try {
      const translations = await getTranslations(true)
      const sections = translations.he?.about?.sections || []
      const sectionsEn = translations.en?.about?.sections || []

      sections.splice(index, 1)
      sectionsEn.splice(index, 1)

      translations.he.about = translations.he.about || {}
      translations.en.about = translations.en.about || {}
      translations.he.about.sections = sections
      translations.en.about.sections = sectionsEn

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
    if (index === 0) return // Already at top

    try {
      const translations = await getTranslations(true)
      const sections = translations.he?.about?.sections || []
      const sectionsEn = translations.en?.about?.sections || []

      // Swap with previous item
      const temp = sections[index]
      sections[index] = sections[index - 1]
      sections[index - 1] = temp

      const tempEn = sectionsEn[index]
      sectionsEn[index] = sectionsEn[index - 1]
      sectionsEn[index - 1] = tempEn

      translations.he.about = translations.he.about || {}
      translations.en.about = translations.en.about || {}
      translations.he.about.sections = sections
      translations.en.about.sections = sectionsEn

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
    if (index === displaySections.length - 1) return // Already at bottom

    try {
      const translations = await getTranslations(true)
      const sections = translations.he?.about?.sections || []
      const sectionsEn = translations.en?.about?.sections || []

      // Swap with next item
      const temp = sections[index]
      sections[index] = sections[index + 1]
      sections[index + 1] = temp

      const tempEn = sectionsEn[index]
      sectionsEn[index] = sectionsEn[index + 1]
      sectionsEn[index + 1] = tempEn

      translations.he.about = translations.he.about || {}
      translations.en.about = translations.en.about || {}
      translations.he.about.sections = sections
      translations.en.about.sections = sectionsEn

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
    <section id="about" className="about">
      <div className="container">
        <h2 className="section-title">
          <EditableText translationKey="about.title">
            {t('about.title')}
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
        <div className="about-content">
          {displaySections.map((section, index) => {
            const isReverse = index % 2 === 1
            const hasImage = !!section.imageKey
            const sectionId = `about-section-${index}`
            
            return (
              <div key={index} id={sectionId} className={`about-item ${isReverse ? 'about-item-reverse' : ''}`}>
                <div className="about-text">
                  {section.title && (
                    <h3>
                      <EditableText translationKey={`about.sections.${index}.title`}>
                        {section.title}
                      </EditableText>
                    </h3>
                  )}
                  <p>
                    <EditableText translationKey={`about.sections.${index}.text`}>
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
                  <div className="about-image">
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
              sectionKey="about"
              sectionIndex={editingIndex}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
          {showAddModal && (
            <SectionEditor
              sectionKey="about"
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

export default About
