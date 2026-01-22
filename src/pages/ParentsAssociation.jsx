import { useTranslation } from '../contexts/TranslationContext'
import DocumentHead from '../components/DocumentHead'
import Hero from '../components/Hero'
import ParentsAssociationSections from '../components/ParentsAssociationSections'

function ParentsAssociation() {
  const { t } = useTranslation()

  return (
    <>
      <DocumentHead 
        title={t('meta.parentsAssociationTitle')}
        description={t('meta.parentsAssociationDescription')}
      />
      <Hero />
      <ParentsAssociationSections />
    </>
  )
}

export default ParentsAssociation
