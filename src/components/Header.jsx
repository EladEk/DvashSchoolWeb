import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import LanguageSwitcher from './LanguageSwitcher'
import './Header.css'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const { t } = useTranslation()
  const isHomePage = location.pathname === '/'

  const menuItems = [
    { id: 'home', labelKey: 'nav.home', href: '/', hash: '' },
    { id: 'faq', labelKey: 'nav.faq', href: '/שאלות-תשובות', hash: '' },
    { id: 'parents', labelKey: 'nav.parents', href: '/parent-committee', hash: '' },
    { id: 'parliament', labelKey: 'nav.parliament', href: '/parliament', hash: '' },
  ]

  // Build subtitle items dynamically from sections
  const aboutSections = t('about.sections')
  const communitySections = t('community.sections')
  const learningSections = t('learning.sections')
  const authoritiesSections = t('authorities.sections')

  const subtitleItems = []

  // About section
  const hasAboutSections = Array.isArray(aboutSections) && aboutSections.length > 0
  if (hasAboutSections) {
    aboutSections.forEach((section, index) => {
      if (section && (section.title || section.text)) {
        subtitleItems.push({
          id: `about-section-${index}`,
          label: section.title || t('nav.about'),
          hash: `#about-section-${index}`
        })
      }
    })
  } else {
    subtitleItems.push({ id: 'about', labelKey: 'nav.about', hash: '#about' })
  }

  // Authorities section
  const hasAuthoritiesSections = Array.isArray(authoritiesSections) && authoritiesSections.length > 0
  if (hasAuthoritiesSections) {
    authoritiesSections.forEach((section, index) => {
      if (section && (section.title || section.text)) {
        subtitleItems.push({
          id: `authorities-section-${index}`,
          label: section.title || t('nav.authorities'),
          hash: `#authorities-section-${index}`
        })
      }
    })
  } else {
    subtitleItems.push({ id: 'authorities', labelKey: 'nav.authorities', hash: '#authorities' })
  }

  // Learning section
  const hasLearningSections = Array.isArray(learningSections) && learningSections.length > 0
  if (hasLearningSections) {
    learningSections.forEach((section, index) => {
      if (section && (section.title || section.text)) {
        subtitleItems.push({
          id: `learning-section-${index}`,
          label: section.title || t('nav.learning'),
          hash: `#learning-section-${index}`
        })
      }
    })
  } else {
    subtitleItems.push({ id: 'learning', labelKey: 'nav.learning', hash: '#learning' })
  }

  // Community section
  const hasCommunitySections = Array.isArray(communitySections) && communitySections.length > 0
  if (hasCommunitySections) {
    communitySections.forEach((section, index) => {
      if (section && (section.title || section.text)) {
        subtitleItems.push({
          id: `community-section-${index}`,
          label: section.title || t('nav.community'),
          hash: `#community-section-${index}`
        })
      }
    })
  } else {
    subtitleItems.push({ id: 'community', labelKey: 'nav.community', hash: '#community' })
  }

  const scrollToSection = (hash) => {
    const element = document.querySelector(hash)
    if (element) {
      // Calculate header height (main header + subtitle nav if on home page)
      const header = document.querySelector('.header')
      const adminToolbar = document.querySelector('.admin-toolbar')
      const headerHeight = header ? header.offsetHeight : 0
      const adminToolbarHeight = adminToolbar ? adminToolbar.offsetHeight : 0
      const offset = headerHeight + adminToolbarHeight + 20 // Add 20px extra spacing
      
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  const handleLinkClick = (href, hash) => {
    setIsMenuOpen(false)
    if (hash) {
      // If on home page, scroll to section
      if (location.pathname === '/') {
        scrollToSection(hash)
      } else {
        // Navigate to home then scroll
        window.location.href = href + hash
      }
    }
  }

  const handleSubtitleClick = (hash) => {
    scrollToSection(hash)
  }

  return (
    <header className="header">
      <div className="header-main">
        <div className="header-container">
          <div className="logo">
            <Link to="/" className="logo-link">
              <img 
                src="/assets/LOGO.avif" 
                alt={t('common.schoolName') || 'בית ספר דב״ש'}
                className="logo-image"
                onError={(e) => {
                  e.target.style.display = 'none'
                  const textEl = e.target.nextSibling
                  if (textEl) textEl.style.display = 'block'
                }}
              />
              <h1 className="logo-text" style={{ display: 'none' }}>
                {t('common.schoolName')}
              </h1>
            </Link>
          </div>
          <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
            <ul className="nav-list">
              {menuItems.map((item) => (
                <li key={item.id}>
                  {item.hash ? (
                    <a 
                      href={item.href + item.hash} 
                      onClick={(e) => {
                        e.preventDefault()
                        handleLinkClick(item.href, item.hash)
                      }}
                    >
                      {t(item.labelKey)}
                    </a>
                  ) : (
                    <Link 
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t(item.labelKey)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <LanguageSwitcher />
          </nav>
          <button 
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={t('nav.menu')}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      {isHomePage && (
        <div className="subtitle-nav-wrapper">
          <nav className="subtitle-nav">
            <div className="subtitle-nav-container">
              <ul className="subtitle-nav-list">
                {subtitleItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.hash}
                      onClick={(e) => {
                        e.preventDefault()
                        handleSubtitleClick(item.hash)
                      }}
                    >
                      {item.label || (item.labelKey ? t(item.labelKey) : item.id)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
