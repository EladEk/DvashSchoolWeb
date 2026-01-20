import { useTranslation } from '../contexts/TranslationContext'
import EditableText from './EditableText'
import './Learning.css'

const Learning = () => {
  const { t } = useTranslation()

  return (
    <section id="learning" className="learning">
      <div className="container">
        <div className="learning-content">
          <div className="learning-text">
            <h2 className="section-title">
              <EditableText translationKey="learning.title">
                {t('learning.title')}
              </EditableText>
            </h2>
            <p>
              <EditableText translationKey="learning.text">
                {t('learning.text')}
              </EditableText>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Learning
