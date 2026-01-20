import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import LanguageSwitcher from './LanguageSwitcher'
import './Header.css'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const { t } = useTranslation()

  const menuItems = [
    { id: 'home', labelKey: 'nav.home', href: '/', hash: '' },
    { id: 'about', labelKey: 'nav.about', href: '/', hash: '#about' },
    { id: 'authorities', labelKey: 'nav.authorities', href: '/', hash: '#authorities' },
    { id: 'learning', labelKey: 'nav.learning', href: '/', hash: '#learning' },
    { id: 'community', labelKey: 'nav.community', href: '/', hash: '#community' },
    { id: 'faq', labelKey: 'nav.faq', href: '/שאלות-תשובות', hash: '' },
    { id: 'parents', labelKey: 'nav.parents', href: '/', hash: '#parents' },
  ]

  const handleLinkClick = (href, hash) => {
    setIsMenuOpen(false)
    if (hash) {
      // If on home page, scroll to section
      if (location.pathname === '/') {
        const element = document.querySelector(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        // Navigate to home then scroll
        window.location.href = href + hash
      }
    }
  }

  return (
    <header className="header">
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
    </header>
  )
}

export default Header
