import { useTranslation } from '../contexts/TranslationContext'
import DocumentHead from '../components/DocumentHead'
import Contact from '../components/Contact'

function ContactPage() {
  const { t } = useTranslation()

  return (
    <>
      <DocumentHead 
        title={t('meta.contactTitle')}
        description={t('meta.contactDescription')}
      />
      <Contact />
    </>
  )
}

export default ContactPage
