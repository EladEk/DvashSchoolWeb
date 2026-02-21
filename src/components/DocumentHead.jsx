// React 19 native document metadata support
// SEO: title, description, canonical, Open Graph, Twitter Card (no change to app logic)

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://dvashschool.vercel.app'

export default function DocumentHead({ title, description, canonicalPath }) {
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}` : null
  return (
    <>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {canonical && <meta property="og:url" content={canonical} />}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="he_IL" />
      <meta property="og:site_name" content="בית ספר דב״ש" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:card" content="summary_large_image" />
    </>
  )
}
