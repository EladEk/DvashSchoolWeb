import { useAdmin } from '../contexts/AdminContext'
import EditButton from './EditButton'

const EditableText = ({ translationKey, children, className = '' }) => {
  const { isAdminMode } = useAdmin()

  if (!isAdminMode) {
    return <span className={className}>{children}</span>
  }

  return (
    <span className={`editable-text ${className}`}>
      {children}
      <EditButton translationKey={translationKey} />
    </span>
  )
}

export default EditableText
