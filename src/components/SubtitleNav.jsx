import { useTranslation } from '../contexts/TranslationContext'
import './SubtitleNav.css'

const SubtitleNav = () => {
  const { t } = useTranslation()

  // Get sections from translations to build dynamic nav
  // Check if sections exist, otherwise use default structure
  const aboutSections = t('about.sections')
  const communitySections = t('community.sections')
  const learningSections = t('learning.sections')
  const authoritiesSections = t('authorities.sections')

  // Build subtitle items - include main sections and their subsections if they exist
  const subtitleItems = []

  // About section
  const hasAboutSections = Array.isArray(aboutSections) && aboutSections.length > 0
  if (hasAboutSections) {
    aboutSections.forEach((section, index) => {
      if (section.title || section.text) {
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
      if (section.title || section.text) {
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
      if (section.title || section.text) {
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
      if (section.title || section.text) {
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
                {item.label || (item.labelKey ? t(item.labelKey) : item.id)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export default SubtitleNav
