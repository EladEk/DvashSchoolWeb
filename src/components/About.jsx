import { useTranslation } from '../contexts/TranslationContext'
import EditableText from './EditableText'
import './About.css'

const About = () => {
  const { t } = useTranslation()

  return (
    <section id="about" className="about">
      <div className="container">
        <h2 className="section-title">
          <EditableText translationKey="about.title">
            {t('about.title')}
          </EditableText>
        </h2>
        <div className="about-content">
          <div className="about-item">
            <div className="about-text">
              <h3>
                <EditableText translationKey="about.background">
                  {t('about.background')}
                </EditableText>
              </h3>
              <p>
                <EditableText translationKey="about.text1">
                  {t('about.text1')}
                </EditableText>
              </p>
            </div>
            <div className="about-image">
              <div className="image-placeholder">
                <p>
                  <EditableText translationKey="about.image1">
                    {t('about.image1')}
                  </EditableText>
                </p>
              </div>
            </div>
          </div>
          <div className="about-item about-item-reverse">
            <div className="about-text">
              <p>
                <EditableText translationKey="about.text2">
                  {t('about.text2')}
                </EditableText>
              </p>
            </div>
            <div className="about-image">
              <div className="image-placeholder">
                <p>
                  <EditableText translationKey="about.image2">
                    {t('about.image2')}
                  </EditableText>
                </p>
              </div>
            </div>
          </div>
          <div className="about-item">
            <div className="about-text">
              <p>
                <EditableText translationKey="about.text3">
                  {t('about.text3') || ''}
                </EditableText>
              </p>
            </div>
            <div className="about-image">
              <div className="image-placeholder">
                <p>
                  <EditableText translationKey="about.image3">
                    {t('about.image3')}
                  </EditableText>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
