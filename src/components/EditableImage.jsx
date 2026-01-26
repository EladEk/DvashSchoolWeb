import { useState, useEffect } from 'react'
import { useAdmin } from '../contexts/AdminContext'
import { useTranslation } from '../contexts/TranslationContext'
import { loadImagePathFromDB } from '../services/firebaseDB'
import ImageEditor from './ImageEditor'
import './EditableImage.css'

// Cache for image paths to avoid repeated DB calls
// NOTE: Cache duration is short to ensure fresh data in production mode
const imagePathCache = new Map()
const imagePathCacheTime = new Map()
const CACHE_DURATION = 30 * 1000 // 30 seconds (short to minimize cache issues in production)

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
    // Load image path - in production mode loads from GitHub, in edit mode from Firebase
    const loadImage = async () => {
      try {
        // Check cache first (short duration to minimize stale data)
        const cached = imagePathCache.get(imageKey)
        const cacheTime = imagePathCacheTime.get(imageKey)
        const now = Date.now()
        
        if (cached && cacheTime && (now - cacheTime) < CACHE_DURATION) {
          // Use cached value
          setImagePath(cached)
          setLoading(false)
          return
        }
        
        // Check localStorage as fallback (but prefer fresh data from source)
        const stored = localStorage.getItem(`image_${imageKey}`)
        if (stored && !cached) {
          // Only use localStorage if cache expired and we don't have fresh data yet
          setImagePath(stored)
          imagePathCache.set(imageKey, stored)
          imagePathCacheTime.set(imageKey, now)
          setLoading(false)
          // Still try to load from source to update cache
        }
        
        // Load from source (GitHub in production, Firebase in edit mode)
        const dbPath = await loadImagePathFromDB(imageKey)
        
        if (dbPath) {
          setImagePath(dbPath)
          localStorage.setItem(`image_${imageKey}`, dbPath)
          // Update cache
          imagePathCache.set(imageKey, dbPath)
          imagePathCacheTime.set(imageKey, now)
        } else {
          // Cache null result too to avoid repeated queries
          imagePathCache.set(imageKey, null)
          imagePathCacheTime.set(imageKey, now)
          // If we had localStorage value, keep it
          if (stored) {
            setImagePath(stored)
          } else {
            setImagePath(null)
          }
        }
      } catch (error) {
        console.error(`[EditableImage] Error loading image ${imageKey} from DB:`, error)
        // Fallback to localStorage if available
        const stored = localStorage.getItem(`image_${imageKey}`)
        if (stored) {
          setImagePath(stored)
        }
      } finally {
        setLoading(false)
      }
    }
    loadImage()
  }, [imageKey])

  const handleImageUpdate = (newPath) => {
    // Update state immediately to trigger re-render
    setImagePath(newPath)
    // Save to localStorage
    if (newPath) {
      localStorage.setItem(`image_${imageKey}`, newPath)
    } else {
      localStorage.removeItem(`image_${imageKey}`)
    }
    // Update cache
    imagePathCache.set(imageKey, newPath)
    imagePathCacheTime.set(imageKey, Date.now())
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
        src={(() => {
          // Normalize path: if it's already a full URL, use it; otherwise prepend base URL
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
