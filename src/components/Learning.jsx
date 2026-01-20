import { useTranslation } from '../contexts/TranslationContext'
import './Learning.css'

const Learning = () => {
  const { t } = useTranslation()

  return (
    <section id="learning" className="learning">
      <div className="container">
        <div className="learning-content">
          <div className="learning-text">
            <h2 className="section-title">{t('learning.title')}</h2>
            <p>{t('learning.text')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Learning
