// JSON-LD Organization schema for SEO (no impact on app logic)

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://dvashschool.vercel.app'

const schema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'בית ספר דב״ש',
  alternateName: 'Dvash Democratic School Be\'er Sheva',
  url: SITE_URL,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    url: `${SITE_URL}/contact`,
    availableLanguage: ['Hebrew', 'English']
  }
}

export default function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
