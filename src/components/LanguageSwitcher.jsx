import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import './LanguageSwitcher.css'

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useTranslation()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const handleLanguageChange = (lang) => {
    changeLanguage(lang)
    setIsDropdownOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  return (
    <div className="language-switcher">
      {/* Desktop view - buttons */}
      <button
        className={`lang-btn ${language === 'he' ? 'active' : ''}`}
        onClick={() => changeLanguage('he')}
        aria-label="עברית"
        title="עברית"
      >
        HE
      </button>
      <button
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
        aria-label="English"
        title="English"
      >
        EN
      </button>

      {/* Mobile view - dropdown */}
      <div className={`language-switcher-dropdown ${isDropdownOpen ? 'open' : ''}`} ref={dropdownRef}>
        <button
          className="lang-dropdown-btn"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-label="Change language"
        >
          {language === 'he' ? 'HE' : 'EN'}
          <span className="dropdown-arrow">▼</span>
        </button>
        {isDropdownOpen && (
          <div className="lang-dropdown-menu">
            <button
              className={`lang-dropdown-item ${language === 'he' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('he')}
            >
              HE
            </button>
            <button
              className={`lang-dropdown-item ${language === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              EN
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LanguageSwitcher
