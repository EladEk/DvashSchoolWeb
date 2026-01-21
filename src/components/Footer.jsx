import { Link } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import './Footer.css'

const Footer = () => {
  const { t } = useTranslation()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <p>{t('footer.text')}</p>
          <p className="footer-links">
            <Link to="/contact-8">{t('footer.contact')}</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
