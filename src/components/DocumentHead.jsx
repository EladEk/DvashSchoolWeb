// React 19 native document metadata support
// This component can be used to set document metadata anywhere in the component tree

export default function DocumentHead({ title, description }) {
  return (
    <>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
    </>
  )
}
