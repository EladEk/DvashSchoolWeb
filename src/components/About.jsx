import { useTranslation } from '../contexts/TranslationContext'
import './About.css'

const About = () => {
  const { t } = useTranslation()

  return (
    <section id="about" className="about">
      <div className="container">
        <h2 className="section-title">{t('about.title')}</h2>
        <div className="about-content">
          <div className="about-text">
            <h3>{t('about.background')}</h3>
            <p>{t('about.text1')}</p>
            <p>{t('about.text2')}</p>
          </div>
          <div className="about-images">
            <div className="image-placeholder">
              <p>{t('about.image1')}</p>
            </div>
            <div className="image-placeholder">
              <p>{t('about.image2')}</p>
            </div>
            <div className="image-placeholder">
              <p>{t('about.image3')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
