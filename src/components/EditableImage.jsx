import { useState, useEffect, useRef } from 'react'
import { useAdmin } from '../contexts/AdminContext'
import { useTranslation } from '../contexts/TranslationContext'
import { loadImagePathFromDB, clearAllImageCaches } from '../services/firebaseDB'
import ImageEditor from './ImageEditor'
import './EditableImage.css'

// Cache for image paths to avoid repeated DB calls
// Cleared when entering/exiting edit mode so correct source (Git vs DB) is used
const imagePathCache = new Map()
const imagePathCacheTime = new Map()
const CACHE_DURATION = 30 * 1000 // 30 seconds (short to minimize cache issues in production)

/** Clear all image caches when edit mode changes (so images reload from Git or DB) */
const clearEditableImageCachesForModeChange = () => {
  imagePathCache.clear()
  imagePathCacheTime.clear()
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('image_')) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch (e) {}
  clearAllImageCaches()
}

const EditableImage = ({ imageKey, defaultImage = null, className = '', alt = '' }) => {
  const { isAdminMode } = useAdmin()
  const { t } = useTranslation()
  const [showEditor, setShowEditor] = useState(false)
  const [imagePath, setImagePath] = useState(() => {
    const stored = localStorage.getItem(`image_${imageKey}`)
    return stored || defaultImage
  })
  const [loading, setLoading] = useState(true)
  const prevAdminModeRef = useRef(undefined)

  // When enter/exit edit mode (not on mount), clear all image caches so we load from correct source (Git vs DB)
  useEffect(() => {
    const prev = prevAdminModeRef.current
    prevAdminModeRef.current = isAdminMode
    if (prev !== undefined && prev !== isAdminMode) {
      clearEditableImageCachesForModeChange()
    }
  }, [isAdminMode])

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true)
        const cached = imagePathCache.get(imageKey)
        const cacheTime = imagePathCacheTime.get(imageKey)
        const now = Date.now()

        if (cached !== undefined && cacheTime && (now - cacheTime) < CACHE_DURATION) {
          setImagePath(cached || defaultImage)
          setLoading(false)
          return
        }

        const stored = localStorage.getItem(`image_${imageKey}`)
        if (stored && cached === undefined) {
          setImagePath(stored)
          imagePathCache.set(imageKey, stored)
          imagePathCacheTime.set(imageKey, now)
          setLoading(false)
        }

        const dbPath = await loadImagePathFromDB(imageKey)

        if (dbPath) {
          setImagePath(dbPath)
          localStorage.setItem(`image_${imageKey}`, dbPath)
          imagePathCache.set(imageKey, dbPath)
          imagePathCacheTime.set(imageKey, now)
        } else {
          imagePathCache.set(imageKey, null)
          imagePathCacheTime.set(imageKey, now)
          setImagePath(stored || defaultImage || null)
        }
      } catch (error) {
        console.error(`[EditableImage] Error loading image ${imageKey}:`, error)
        const stored = localStorage.getItem(`image_${imageKey}`)
        setImagePath(stored || defaultImage || null)
      } finally {
        setLoading(false)
      }
    }
    loadImage()
  }, [imageKey, isAdminMode])

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
