import { useTranslation } from '../contexts/TranslationContext'
import './SubtitleNav.css'

const SubtitleNav = () => {
  const { t } = useTranslation()

  // Build subtitle items dynamically from generic sections
  // Navigation takes the name from section title
  const subtitleItems = []
  
  // Get generic sections (not tied to specific section types)
  const sections = t('sections')
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
        const sectionId = `section-${index}`
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
