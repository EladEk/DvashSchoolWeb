import { useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import GenericSectionEditor from './GenericSectionEditor'
import './Hero.css'

const Hero = () => {
  const { t } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [showAddModal, setShowAddModal] = useState(false)

  const handleEditorClose = () => {
    setShowAddModal(false)
  }

  const handleEditorSave = () => {
    // Reload will happen automatically via GenericSectionEditor
  }

  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h2 className="hero-title">
            <EditableText translationKey="hero.title">
              {t('hero.title')}
            </EditableText>
          </h2>
          <p className="hero-subtitle">
            <EditableText translationKey="hero.subtitle">
              {t('hero.subtitle')}
            </EditableText>
          </p>
          {isAdminMode && (
            <div style={{ marginTop: '1rem' }}>
              <button 
                className="section-add-btn" 
                onClick={() => setShowAddModal(true)}
                title="הוסף סעיף חדש"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                + הוסף סעיף
              </button>
            </div>
          )}
        </div>
        <div className="hero-image">
          <EditableImage imageKey="hero.image" alt={t('hero.image')} />
        </div>
      </div>
      {isAdminMode && showAddModal && (
        <GenericSectionEditor
          sectionIndex={null}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
        />
      )}
    </section>
  )
}

export default Hero
