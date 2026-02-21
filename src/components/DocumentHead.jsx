// React 19 native document metadata support
// SEO: title, description, canonical, Open Graph, Twitter Card (no change to app logic)

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://dvashschool.vercel.app'
// Share image: use public/og-image.jpg (1200x630) if you add it; otherwise logo is used
const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/LOGO.avif`

export default function DocumentHead({ title, description, canonicalPath }) {
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}` : null
  const ogImage = DEFAULT_OG_IMAGE
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
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={ogImage} />
    </>
  )
}
