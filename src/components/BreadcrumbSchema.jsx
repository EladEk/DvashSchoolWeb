// JSON-LD BreadcrumbList for SEO (no impact on app logic)

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://dvashschool.vercel.app'

// URL path is /FAQ; display text stays Hebrew "שאלות ותשובות"
const pathToName = {
  '': 'בית',
  'FAQ': 'שאלות ותשובות',
  'contact': 'צור קשר',
  'parent-committee': 'וועד ההורים',
  'parents-association': 'התאחדות ההורים',
  'parliament': 'פרלמנט'
}

export default function BreadcrumbSchema({ pathname }) {
  if (!pathname || pathname.startsWith('/admin')) return null
  try {
    pathname = decodeURIComponent(pathname)
  } catch (_) {}
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean)
  const items = [
    { name: 'בית ספר דב״ש', url: SITE_URL },
    ...segments.map((seg, i) => ({
      name: pathToName[seg] || seg,
      url: `${SITE_URL}/${segments.slice(0, i + 1).join('/')}`
    }))
  ]
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url
    }))
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
