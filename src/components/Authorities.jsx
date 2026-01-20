import { useTranslation } from '../contexts/TranslationContext'
import EditableText from './EditableText'
import './Authorities.css'

const Authorities = () => {
  const { t } = useTranslation()

  return (
    <section id="authorities" className="authorities">
      <div className="container">
        <div className="authorities-content">
          <div className="authorities-text">
            <h2 className="section-title">
              <EditableText translationKey="authorities.title">
                {t('authorities.title')}
              </EditableText>
            </h2>
            <p>
              <EditableText translationKey="authorities.text">
                {t('authorities.text')}
              </EditableText>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Authorities
