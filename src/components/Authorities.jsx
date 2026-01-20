import { useTranslation } from '../contexts/TranslationContext'
import './Authorities.css'

const Authorities = () => {
  const { t } = useTranslation()

  return (
    <section id="authorities" className="authorities">
      <div className="container">
        <div className="authorities-content">
          <div className="authorities-text">
            <h2 className="section-title">{t('authorities.title')}</h2>
            <p>{t('authorities.text')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Authorities
