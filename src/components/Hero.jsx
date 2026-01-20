import { useTranslation } from '../contexts/TranslationContext'
import './Hero.css'

const Hero = () => {
  const { t } = useTranslation()

  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h2 className="hero-title">{t('hero.title')}</h2>
          <p className="hero-subtitle">{t('hero.subtitle')}</p>
        </div>
        <div className="hero-image">
          <div className="image-placeholder">
            <p>{t('hero.image')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
