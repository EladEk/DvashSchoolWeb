import { useTranslation } from '../contexts/TranslationContext'
import EditableText from './EditableText'
import './Community.css'

const Community = () => {
  const { t } = useTranslation()

  return (
    <section id="community" className="community">
      <div className="container">
        <div className="community-content">
          <div className="community-text">
            <h2 className="section-title">
              <EditableText translationKey="community.title">
                {t('community.title')}
              </EditableText>
            </h2>
            <p>
              <EditableText translationKey="community.text">
                {t('community.text')}
              </EditableText>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Community
