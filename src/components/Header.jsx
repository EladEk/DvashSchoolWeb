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
  ]

  const subtitleItems = [
    { id: 'about', labelKey: 'nav.about', hash: '#about' },
    { id: 'authorities', labelKey: 'nav.authorities', hash: '#authorities' },
    { id: 'learning', labelKey: 'nav.learning', hash: '#learning' },
    { id: 'community', labelKey: 'nav.community', hash: '#community' },
  ]

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
            <Link to="/">
              <h1>{t('common.schoolName')}</h1>
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
                      {t(item.labelKey)}
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
