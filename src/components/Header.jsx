import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import LanguageSwitcher from './LanguageSwitcher'
import './Header.css'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const navRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAdminMode, toggleAdminMode } = useAdmin()
  const isHomePage = location.pathname === '/'
  const isParentsAssociationPage = location.pathname === '/parents-association'

  // Check if user is logged in and has admin/editor/committee role
  useEffect(() => {
    const checkAdminAccess = () => {
      try {
        const session = JSON.parse(localStorage.getItem('session') || 'null')
        if (session) {
          const role = (session.role || '').trim().toLowerCase()
          const hasAccess = role === 'admin' || role === 'editor' || role === 'committee' || session.mode === 'system-admin'
          setHasAdminAccess(hasAccess)
        } else {
          setHasAdminAccess(false)
        }
      } catch (e) {
        setHasAdminAccess(false)
      }
    }

    checkAdminAccess()
    // Check periodically for session changes
    const interval = setInterval(checkAdminAccess, 1000)
    
    // Listen to storage events (for cross-tab updates and logout)
    const handleStorageChange = (e) => {
      if (e.key === 'session') {
        checkAdminAccess()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleAdminClick = () => {
    if (isAdminMode) {
      // If already in admin mode, go to dashboard
      navigate('/admin/dashboard')
    } else {
      // Enter admin mode
      try {
        const session = JSON.parse(localStorage.getItem('session') || 'null')
        if (session) {
          const role = (session.role || '').trim().toLowerCase()
          if (role === 'admin' || role === 'editor' || role === 'committee' || session.mode === 'system-admin') {
            sessionStorage.setItem('adminAuthenticated', 'true')
            sessionStorage.removeItem('justExitedAdminMode')
            if (!isAdminMode) {
              toggleAdminMode()
            }
          } else {
            navigate('/parliament/login', { 
              state: { from: { pathname: window.location.pathname } },
              replace: false 
            })
          }
        } else {
          navigate('/parliament/login', { 
            state: { from: { pathname: window.location.pathname } },
            replace: false 
          })
        }
      } catch (e) {
        navigate('/parliament/login', { 
          state: { from: { pathname: window.location.pathname } },
          replace: false 
        })
      }
    }
  }

  const menuItems = [
    { id: 'home', labelKey: 'nav.home', href: '/', hash: '' },
    { id: 'faq', labelKey: 'nav.faq', href: '/שאלות-תשובות', hash: '' },
    { id: 'parents', labelKey: 'nav.parents', href: '/parent-committee', hash: '' },
    { id: 'parentsAssociation', labelKey: 'nav.parentsAssociation', href: '/parents-association', hash: '' },
    { id: 'parliament', labelKey: 'nav.parliament', href: '/parliament', hash: '' },
  ]

  // Build subtitle items dynamically from generic sections
  // Navigation takes the name from section title
  const subtitleItems = []
  
  // Get sections based on current page
  let sections = []
  let sectionPrefix = 'section'
  
  if (isParentsAssociationPage) {
    // Get Parents Association sections
    sections = t('parentsAssociationSections')
    sectionPrefix = 'parents-association-section'
  } else {
    // Get home page sections
    sections = t('sections')
    sectionPrefix = 'section'
  }
  
  const hasSections = Array.isArray(sections) && sections.length > 0
  
  if (hasSections) {
    // Create a copy and sort by position
    const sortedSections = [...sections].sort((a, b) => {
      const posA = a.position !== undefined ? a.position : 999
      const posB = b.position !== undefined ? b.position : 999
      return posA - posB
    })
    
    // Show each section with its title (title is required for navigation)
    sortedSections.forEach((section, index) => {
      if (section && section.title) {
        // Use title for navigation label, create unique ID
        const sectionId = `${sectionPrefix}-${index}`
        subtitleItems.push({
          id: sectionId,
          label: section.title,
          hash: `#${sectionId}`,
          position: section.position !== undefined ? section.position : index
        })
      }
    })
  }
  
  // Sort by position
  subtitleItems.sort((a, b) => {
    if (a.position !== undefined && b.position !== undefined) {
      return a.position - b.position
    }
    return 0
  })

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
      // If on home page or Parents Association page, scroll to section
      if (location.pathname === '/' || location.pathname === '/parents-association') {
        scrollToSection(hash)
      } else {
        // Navigate to the page then scroll
        window.location.href = href + hash
      }
    }
  }

  const handleSubtitleClick = (hash) => {
    scrollToSection(hash)
  }

  // When mobile menu is closed: aria-hidden + inert so the nav is not focusable
  // (ARIA hidden element must not contain focusable elements). Only on mobile (<=768px).
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const isMobile = () => window.innerWidth <= 768
    const updateAriaAndInert = () => {
      if (isMobile() && !isMenuOpen) {
        nav.setAttribute('aria-hidden', 'true')
        nav.setAttribute('inert', '')
      } else {
        nav.removeAttribute('aria-hidden')
        nav.removeAttribute('inert')
      }
    }
    updateAriaAndInert()
    window.addEventListener('resize', updateAriaAndInert)
    return () => {
      window.removeEventListener('resize', updateAriaAndInert)
      nav.removeAttribute('aria-hidden')
      nav.removeAttribute('inert')
    }
  }, [isMenuOpen])

  return (
    <header className="header">
      <div className="header-main">
        <div className="header-container">
          <div className="header-left">
            <LanguageSwitcher compact={hasAdminAccess} />
          </div>
          <nav
            id="main-nav"
            ref={navRef}
            className={`nav ${isMenuOpen ? 'nav-open' : ''}`}
          >
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
              {hasAdminAccess && (
                <li>
                  <button
                    className="nav-admin-btn"
                    onClick={handleAdminClick}
                    title={isAdminMode ? 'Admin Dashboard' : 'Enter Admin Mode'}
                  >
                    {isAdminMode ? 'Admin' : 'Admin'}
                  </button>
                </li>
              )}
            </ul>
          </nav>
          <div className="header-right">
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
          </div>
          <button 
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={t('nav.menu')}
            aria-expanded={isMenuOpen}
            aria-controls="main-nav"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      {(isHomePage || isParentsAssociationPage) && subtitleItems.length > 0 && (
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
