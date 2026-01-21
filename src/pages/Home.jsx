import { useTranslation } from '../contexts/TranslationContext'
import DocumentHead from '../components/DocumentHead'
import Hero from '../components/Hero'
import GenericSections from '../components/GenericSections'

function Home() {
  const { t } = useTranslation()

  return (
    <>
      <DocumentHead 
        title={t('meta.homeTitle')}
        description={t('meta.homeDescription')}
      />
      <Hero />
      <GenericSections />
    </>
  )
}

export default Home
