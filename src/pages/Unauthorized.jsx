import { Link } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import './Unauthorized.css'

const Unauthorized = () => {
  const { t } = useTranslation()

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-container">
        <h1 className="unauthorized-title">
          {t('unauthorized.title') || 'אין לך הרשאה לגשת לדף זה'}
        </h1>
        <p className="unauthorized-message">
          {t('unauthorized.message') || 'אין לך את ההרשאות הנדרשות לגשת לדף זה.'}
        </p>
        <div className="unauthorized-actions">
          <Link to="/" className="btn btn-primary">
            {t('unauthorized.backHome') || 'חזור לדף הבית'}
          </Link>
          <Link to="/parliament" className="btn btn-ghost">
            {t('unauthorized.goToParliament') || 'לפרלמנט'}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Unauthorized
