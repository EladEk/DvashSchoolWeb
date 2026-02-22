import { Link } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import DocumentHead from '../components/DocumentHead'
import './NotFound.css'

function NotFound() {
  const { t } = useTranslation()

  return (
    <>
      <DocumentHead
        title={t('meta.notFoundTitle')}
        description={t('meta.notFoundDescription')}
      />
      <section className="not-found-page" aria-labelledby="not-found-title">
        <div className="not-found-container">
          <h1 id="not-found-title" className="not-found-title">
            {t('notFound.title')}
          </h1>
          <p className="not-found-message">
            {t('notFound.message')}
          </p>
          <Link to="/" className="not-found-link">
            {t('notFound.backHome')}
          </Link>
        </div>
      </section>
    </>
  )
}

export default NotFound
