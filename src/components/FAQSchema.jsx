// JSON-LD FAQPage schema for SEO (no impact on app logic)

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://dvashschool.vercel.app'

export default function FAQSchema({ questions }) {
  const list = Array.isArray(questions) ? questions : []
  if (list.length === 0) return null
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((q) => ({
      '@type': 'Question',
      name: typeof q?.question === 'string' ? q.question : '',
      acceptedAnswer: {
        '@type': 'Answer',
        text: typeof q?.answer === 'string' ? q.answer : ''
      }
    })).filter((e) => e.name)
  }
  if (schema.mainEntity.length === 0) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
