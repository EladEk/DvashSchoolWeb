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
    </div>
  )
}

export default LanguageSwitcher
