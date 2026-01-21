import { useTranslation } from '../contexts/TranslationContext'
import EditableText from './EditableText'
import EditableImage from './EditableImage'
import './Hero.css'

const Hero = () => {
  const { t } = useTranslation()

  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h2 className="hero-title">
            <EditableText translationKey="hero.title">
              {t('hero.title')}
            </EditableText>
          </h2>
          <p className="hero-subtitle">
            <EditableText translationKey="hero.subtitle">
              {t('hero.subtitle')}
            </EditableText>
          </p>
        </div>
        <div className="hero-image">
          <EditableImage imageKey="hero.image" alt={t('hero.image')} />
        </div>
      </div>
    </section>
  )
}

export default Hero
