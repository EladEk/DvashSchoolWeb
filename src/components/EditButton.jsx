import { useState } from 'react'
import InlineEditor from './InlineEditor'
import './EditButton.css'

const EditButton = ({ translationKey, onSave }) => {
  const [isEditing, setIsEditing] = useState(false)

  const handleEdit = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setIsEditing(true)
  }

  const handleClose = () => {
    setIsEditing(false)
  }

  const handleSave = () => {
    if (onSave) {
      onSave()
    }
  }

  return (
    <>
      <button
        className="edit-button"
        onClick={handleEdit}
        aria-label="Edit translation"
        title="Edit translation"
      >
        +
      </button>
      {isEditing && (
        <InlineEditor
          translationKey={translationKey}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}
    </>
  )
}

export default EditButton
