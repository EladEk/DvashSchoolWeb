import { useState, useEffect } from 'react'
import { useAdmin } from '../contexts/AdminContext'
import { useTranslation } from '../contexts/TranslationContext'
import { loadImagePathFromDB } from '../services/firebaseDB'
import ImageEditor from './ImageEditor'
import './EditableImage.css'

const EditableImage = ({ imageKey, defaultImage = null, className = '', alt = '' }) => {
  const { isAdminMode } = useAdmin()
  const { t } = useTranslation()
  const [showEditor, setShowEditor] = useState(false)
  const [imagePath, setImagePath] = useState(() => {
    // Try to load from localStorage first
    const stored = localStorage.getItem(`image_${imageKey}`)
    return stored || defaultImage
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load from Firebase on mount
    const loadImage = async () => {
      try {
        const dbPath = await loadImagePathFromDB(imageKey)
        if (dbPath) {
          setImagePath(dbPath)
          localStorage.setItem(`image_${imageKey}`, dbPath)
        }
      } catch (error) {
        console.error('Error loading image from DB:', error)
      } finally {
        setLoading(false)
      }
    }
    loadImage()
  }, [imageKey])

  const handleImageUpdate = (newPath) => {
    console.log('🖼️ Updating image path:', imageKey, '->', newPath)
    // Update state immediately to trigger re-render
    setImagePath(newPath)
    // Save to localStorage
    if (newPath) {
      localStorage.setItem(`image_${imageKey}`, newPath)
    } else {
      localStorage.removeItem(`image_${imageKey}`)
    }
    // Force a re-render by updating a dummy state if needed
    // The setImagePath should be enough, but we'll ensure it happens
  }

  if (loading) {
    return (
      <div className={`editable-image-container ${className}`}>
        <div className="image-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  if (!imagePath) {
    return (
      <div className={`editable-image-container ${className}`}>
        {isAdminMode ? (
          <>
            <div className="image-placeholder-empty" onClick={() => setShowEditor(true)}>
              <p>{t('image.uploadImage') || 'העלה תמונה'}</p>
              <span className="edit-icon">+</span>
            </div>
            {showEditor && (
              <ImageEditor
                imageKey={imageKey}
                currentPath={null}
                onSave={handleImageUpdate}
                onClose={() => setShowEditor(false)}
              />
            )}
          </>
        ) : (
          <div className="image-placeholder-empty">
            <p>{t('image.noImage') || 'אין תמונה'}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`editable-image-container ${className}`}>
      <img
        key={imagePath} // Force re-render when imagePath changes
        src={`https://ik.imagekit.io/fzv0y7xbu${imagePath}?t=${Date.now()}`}
        alt={alt || imageKey}
        className="editable-image"
        onError={(e) => {
          e.target.style.display = 'none'
          e.target.nextSibling?.classList.add('show')
        }}
      />
      <div className="image-error" style={{ display: 'none' }}>
        {t('image.loadError') || 'שגיאה בטעינת התמונה'}
      </div>
      {isAdminMode && (
        <>
          <button
            className="image-edit-btn"
            onClick={() => setShowEditor(true)}
            title={t('image.edit') || 'ערוך תמונה'}
          >
            ✏️
          </button>
          {showEditor && (
            <ImageEditor
              imageKey={imageKey}
              currentPath={imagePath}
              onSave={handleImageUpdate}
              onClose={() => setShowEditor(false)}
            />
          )}
        </>
      )}
    </div>
  )
}

export default EditableImage
