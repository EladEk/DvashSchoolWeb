import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { saveImagePathToDB } from '../services/firebaseDB'
import ImageKitUpload from './ImageKitUpload'
import './ImageEditor.css'

const ImageEditor = ({ imageKey, currentPath, onSave, onClose }) => {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(currentPath ? `https://ik.imagekit.io/fzv0y7xbu${currentPath}` : null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('image.invalidFile') || 'קובץ לא חוקי. אנא בחר תמונה.')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('image.fileTooLarge') || 'הקובץ גדול מדי. מקסימום 10MB.')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleUploadSuccess = async (response) => {
    try {
      setUploading(true) // Ensure uploading state is set
      const imagePath = response.filePath

      if (!imagePath) {
        throw new Error('Upload succeeded but no file path returned')
      }

      // Update preview immediately with the new image (add timestamp to force reload)
      const imageUrl = `https://ik.imagekit.io/fzv0y7xbu${imagePath}?t=${Date.now()}`
      setPreview(imageUrl)

      // Save to Firebase
      await saveImagePathToDB(imageKey, imagePath)

      // Save to localStorage
      localStorage.setItem(`image_${imageKey}`, imagePath)

      // Update parent component state immediately (this triggers re-render)
      if (onSave) {
        onSave(imagePath)
      }
      
      // Close modal after a brief delay to show success
      setTimeout(() => {
        if (onClose) {
          onClose()
        }
      }, 300)
    } catch (err) {
      console.error('Error saving image path:', err)
      setError(err.message || t('image.saveError') || 'שגיאה בשמירת נתיב התמונה')
      setUploading(false)
    }
  }

  const handleUploadError = (error) => {
    console.error('Upload error:', error)
    setError(error.message || t('image.uploadError') || 'שגיאה בהעלאת התמונה')
    setUploading(false)
    setProgress(0)
  }

  const handleUploadProgress = (progress) => {
    // Progress is handled by ImageKitUpload component
    setUploadProgress(progress)
    setUploading(true) // Ensure uploading state is set during progress
  }

  const handleUploadClick = () => {
    // Trigger the file input from ImageKitUpload
    const uploadInput = document.querySelector('.imagekit-upload-input')
    if (uploadInput) {
      uploadInput.click()
    } else if (fileInputRef.current) {
      // Fallback to local file input
      fileInputRef.current.click()
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('image.confirmDelete') || 'האם אתה בטוח שברצונך למחוק תמונה זו?')) {
      return
    }

    try {
      // Remove from Firebase
      await saveImagePathToDB(imageKey, null)

      // Remove from localStorage
      localStorage.removeItem(`image_${imageKey}`)

      onSave(null)
      onClose()
    } catch (err) {
      console.error('Delete error:', err)
      setError(err.message || t('image.deleteError') || 'שגיאה במחיקת התמונה')
    }
  }

  const modalContent = (
    <div className="image-editor-overlay" onClick={onClose}>
      <div className="image-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="image-editor-header">
          <h3>{t('image.editImage') || 'עריכת תמונה'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="image-editor-content">
          {preview && (
            <div className="image-preview">
              <img src={preview} alt="Preview" />
            </div>
          )}
          <div className="image-upload-section">
            <ImageKitUpload
              fileName={`${imageKey}-${Date.now()}`}
              onSuccess={handleUploadSuccess}
              onError={handleUploadError}
              onProgress={handleUploadProgress}
              folder="/school-website/"
              publicKey="public_Ubfj3JyFAbabaMCqAGRpVj+Jy7c="
              urlEndpoint="https://ik.imagekit.io/fzv0y7xbu"
              authenticationEndpoint={import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT || "/api/auth"}
              transformationPosition="path"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <button
              className="btn-select-file"
              onClick={() => {
                // Try ImageKitUpload input first, then fallback to local
                const ikInput = document.querySelector('.imagekit-upload-input')
                if (ikInput) {
                  ikInput.click()
                } else if (fileInputRef.current) {
                  fileInputRef.current.click()
                }
              }}
              disabled={uploading}
            >
              {t('image.selectFile') || 'בחר קובץ'}
            </button>
          </div>
          {error && <div className="image-error-message">{error}</div>}
        </div>
        <div className="image-editor-footer">
          {currentPath && (
            <button className="btn-delete" onClick={handleDelete} disabled={uploading}>
              {t('image.delete') || 'מחק'}
            </button>
          )}
          <div className="image-editor-actions">
            <button className="btn-cancel" onClick={onClose} disabled={uploading}>
              {t('common.cancel') || 'ביטול'}
            </button>
            <button
              className="btn-upload"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {uploading ? (t('image.uploading') || 'מעלה...') : (t('image.upload') || 'העלה')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Use portal to render outside the DOM hierarchy
  return createPortal(modalContent, document.body)
}

export default ImageEditor
