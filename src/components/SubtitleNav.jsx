import { useTranslation } from '../contexts/TranslationContext'
import './SubtitleNav.css'

const SubtitleNav = () => {
  const { t } = useTranslation()

  const subtitleItems = [
    { id: 'about', labelKey: 'nav.about', hash: '#about' },
    { id: 'authorities', labelKey: 'nav.authorities', hash: '#authorities' },
    { id: 'learning', labelKey: 'nav.learning', hash: '#learning' },
    { id: 'community', labelKey: 'nav.community', hash: '#community' },
  ]

  const handleClick = (hash) => {
    const element = document.querySelector(hash)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav className="subtitle-nav">
      <div className="subtitle-nav-container">
        <ul className="subtitle-nav-list">
          {subtitleItems.map((item) => (
            <li key={item.id}>
              <a
                href={item.hash}
                onClick={(e) => {
                  e.preventDefault()
                  handleClick(item.hash)
                }}
              >
                {t(item.labelKey)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export default SubtitleNav
