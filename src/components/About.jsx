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
      
      // Ensure sections exist and are arrays
      if (!translations.he.about) translations.he.about = {}
      if (!translations.en.about) translations.en.about = {}
      
      let sections = Array.isArray(translations.he.about.sections) ? [...translations.he.about.sections] : []
      let sectionsEn = Array.isArray(translations.en.about.sections) ? [...translations.en.about.sections] : []

      // If we're using old structure, convert it to new structure first
      if (hasOldStructure && sections.length === 0) {
        // Convert old structure to new structure
        sections = [
          { title: t('about.background'), text: t('about.text1'), imageKey: 'about.image1' },
          { text: t('about.text2'), imageKey: 'about.image2' },
          { text: t('about.text3') || '', imageKey: 'about.image3' }
        ].filter(s => s && s.text)
        
        sectionsEn = [
          { title: translations.en?.about?.background || '', text: translations.en?.about?.text1 || '', imageKey: 'about.image1' },
          { text: translations.en?.about?.text2 || '', imageKey: 'about.image2' },
          { text: translations.en?.about?.text3 || '', imageKey: 'about.image3' }
        ].filter(s => s && s.text)
      }

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
      translations.he.about.sections = sections
      translations.en.about.sections = sectionsEn

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
    if (index === 0) return // Already at top

    try {
      const translations = await getTranslations(true)
      
      if (!translations.he.about) translations.he.about = {}
      if (!translations.en.about) translations.en.about = {}
      
      let sections = Array.isArray(translations.he.about.sections) ? [...translations.he.about.sections] : []
      let sectionsEn = Array.isArray(translations.en.about.sections) ? [...translations.en.about.sections] : []

      // If we're using old structure, convert it to new structure first
      if (hasOldStructure && sections.length === 0) {
        sections = [
          { title: t('about.background'), text: t('about.text1'), imageKey: 'about.image1' },
          { text: t('about.text2'), imageKey: 'about.image2' },
          { text: t('about.text3') || '', imageKey: 'about.image3' }
        ].filter(s => s && s.text)
        
        sectionsEn = [
          { title: translations.en?.about?.background || '', text: translations.en?.about?.text1 || '', imageKey: 'about.image1' },
          { text: translations.en?.about?.text2 || '', imageKey: 'about.image2' },
          { text: translations.en?.about?.text3 || '', imageKey: 'about.image3' }
        ].filter(s => s && s.text)
      }

      // Validate index
      if (index < 0 || index >= sections.length) {
        console.error('Invalid index for move up:', index, 'sections length:', sections.length)
        alert('שגיאה: אינדקס לא תקין')
        return
      }

      // Swap with previous item
      const temp = sections[index]
      sections[index] = sections[index - 1]
      sections[index - 1] = temp

      const tempEn = sectionsEn[index]
      sectionsEn[index] = sectionsEn[index - 1]
      sectionsEn[index - 1] = tempEn

      // Update translations
      translations.he.about = translations.he.about || {}
      translations.en.about = translations.en.about || {}
      translations.he.about.sections = sections
      translations.en.about.sections = sectionsEn

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
    if (index === displaySections.length - 1) return // Already at bottom

    try {
      const translations = await getTranslations(true)
      
      if (!translations.he.about) translations.he.about = {}
      if (!translations.en.about) translations.en.about = {}
      
      let sections = Array.isArray(translations.he.about.sections) ? [...translations.he.about.sections] : []
      let sectionsEn = Array.isArray(translations.en.about.sections) ? [...translations.en.about.sections] : []

      // If we're using old structure, convert it to new structure first
      if (hasOldStructure && sections.length === 0) {
        sections = [
          { title: t('about.background'), text: t('about.text1'), imageKey: 'about.image1' },
          { text: t('about.text2'), imageKey: 'about.image2' },
          { text: t('about.text3') || '', imageKey: 'about.image3' }
        ].filter(s => s && s.text)
        
        sectionsEn = [
          { title: translations.en?.about?.background || '', text: translations.en?.about?.text1 || '', imageKey: 'about.image1' },
          { text: translations.en?.about?.text2 || '', imageKey: 'about.image2' },
          { text: translations.en?.about?.text3 || '', imageKey: 'about.image3' }
        ].filter(s => s && s.text)
      }

      // Validate index
      if (index < 0 || index >= sections.length - 1) {
        console.error('Invalid index for move down:', index, 'sections length:', sections.length)
        alert('שגיאה: אינדקס לא תקין')
        return
      }

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
            
            // Always show admin controls - we'll convert old structure to new when needed
            const canEdit = true
            
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
                  {isAdminMode && canEdit && (
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
                        disabled={index >= displaySections.length - 1}
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
