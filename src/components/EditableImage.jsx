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
  const [imagePath, setImagePath] = useState(defaultImage)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const path = await loadImagePathFromDB(imageKey)
        if (!cancelled) {
          setImagePath(path || defaultImage || null)
        }
      } catch (error) {
        console.error(`[EditableImage] Error loading image ${imageKey}:`, error)
        if (!cancelled) setImagePath(defaultImage || null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [imageKey, isAdminMode, defaultImage])

  const handleImageUpdate = (newPath) => {
    setImagePath(newPath || defaultImage || null)
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
        key={imagePath}
        src={(() => {
          if (imagePath && imagePath.startsWith('http')) {
            return `${imagePath}?t=${Date.now()}`
          }
          return `https://ik.imagekit.io/fzv0y7xbu${imagePath}?t=${Date.now()}`
        })()}
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
