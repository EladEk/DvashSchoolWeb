import { useTranslation } from '../contexts/TranslationContext'
import './LanguageSwitcher.css'

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useTranslation()

  return (
    <div className="language-switcher">
      <button
        className={`lang-btn ${language === 'he' ? 'active' : ''}`}
        onClick={() => changeLanguage('he')}
        aria-label="עברית"
      >
        עברית
      </button>
      <button
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
        aria-label="English"
      >
        English
      </button>
    </div>
  )
}

export default LanguageSwitcher
