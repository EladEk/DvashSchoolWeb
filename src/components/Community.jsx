import { useTranslation } from '../contexts/TranslationContext'
import './Community.css'

const Community = () => {
  const { t } = useTranslation()

  return (
    <section id="community" className="community">
      <div className="container">
        <div className="community-content">
          <div className="community-text">
            <h2 className="section-title">{t('community.title')}</h2>
            <p>{t('community.text')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Community
