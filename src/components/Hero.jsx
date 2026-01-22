import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import GenericSectionEditor from './GenericSectionEditor'
import './Hero.css'

const Hero = () => {
  const { t } = useTranslation()
  const { isAdminMode } = useAdmin()
  const location = useLocation()
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Determine which page we're on and use appropriate translation keys
  const isHomePage = location.pathname === '/'
  const isParentsAssociationPage = location.pathname === '/parents-association'
  
  // Use different translation keys based on the page
  const titleKey = isParentsAssociationPage ? 'parentsAssociationHero.title' : 'hero.title'
  const subtitleKey = isParentsAssociationPage ? 'parentsAssociationHero.subtitle' : 'hero.subtitle'
  const imageKey = isParentsAssociationPage ? 'parentsAssociationHero.image' : 'hero.image'
  const imageAltKey = isParentsAssociationPage ? 'parentsAssociationHero.imageAlt' : 'hero.image'

  const handleEditorClose = () => {
    setShowAddModal(false)
  }

  const handleEditorSave = () => {
    // Reload will happen automatically via GenericSectionEditor
  }

  return (
    <section id={isParentsAssociationPage ? "parents-association-hero" : "home"} className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h2 className="hero-title">
            <EditableText translationKey={titleKey}>
              {t(titleKey)}
            </EditableText>
          </h2>
          <p className="hero-subtitle">
            <EditableText translationKey={subtitleKey}>
              {t(subtitleKey)}
            </EditableText>
          </p>
          {isAdminMode && isHomePage && (
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
          <EditableImage imageKey={imageKey} alt={t(imageAltKey) || t(imageKey)} />
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
