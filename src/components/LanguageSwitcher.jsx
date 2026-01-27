import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import './LanguageSwitcher.css'

const LanguageSwitcher = ({ compact = false }) => {
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
    <div className={`language-switcher ${compact ? 'language-switcher--compact' : ''}`} ref={dropdownRef}>
      <div className={`language-switcher-dropdown ${isDropdownOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="lang-dropdown-btn"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-label={language === 'he' ? 'עברית' : 'English'}
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
          aria-controls="lang-menu"
          id="lang-trigger"
          title={language === 'he' ? 'עברית' : 'English'}
        >
          {language === 'he' ? 'HE' : 'EN'}
          <span className="dropdown-arrow" aria-hidden>▼</span>
        </button>
        <div
          id="lang-menu"
          className="lang-dropdown-menu"
          role="listbox"
          aria-labelledby="lang-trigger"
          aria-activedescendant={language === 'he' ? 'lang-he' : 'lang-en'}
          hidden={!isDropdownOpen}
        >
          <button
            type="button"
            id="lang-he"
            role="option"
            aria-selected={language === 'he'}
            className={`lang-dropdown-item ${language === 'he' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('he')}
          >
            HE
          </button>
          <button
            type="button"
            id="lang-en"
            role="option"
            aria-selected={language === 'en'}
            className={`lang-dropdown-item ${language === 'en' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('en')}
          >
            EN
          </button>
        </div>
      </div>
    </div>
  )
}

export default LanguageSwitcher
