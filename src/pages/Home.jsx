import { useTranslation } from '../contexts/TranslationContext'
import DocumentHead from '../components/DocumentHead'
import Hero from '../components/Hero'
import About from '../components/About'
import Community from '../components/Community'
import Learning from '../components/Learning'
import Authorities from '../components/Authorities'

function Home() {
  const { t } = useTranslation()

  return (
    <>
      <DocumentHead 
        title={t('meta.homeTitle')}
        description={t('meta.homeDescription')}
      />
      <Hero />
      <About />
      <Community />
      <Learning />
      <Authorities />
    </>
  )
}

export default Home
