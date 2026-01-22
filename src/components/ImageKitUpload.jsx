import { useRef, useState, useEffect } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import './ImageKitUpload.css'

/**
 * Custom ImageKit Upload component
 * Mimics IKUpload from @imagekit/react SDK
 */
const ImageKitUpload = ({ 
  fileName, 
  onSuccess, 
  onError, 
  onProgress,
  folder = '/school-website/',
  publicKey = 'public_Ubfj3JyFAbabaMCqAGRpVj+Jy7c=',
  urlEndpoint = 'https://ik.imagekit.io/fzv0y7xbu',
  authenticationEndpoint = null, // Default to null, should be passed as prop
  transformationPosition = 'path'
}) => {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      if (onError) {
        onError({
          message: 'Invalid file type. Please select an image.',
        })
      }
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      if (onError) {
        onError({
          message: 'File is too large. Maximum 10MB.',
        })
      }
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      // Get authentication token from server (optional - only if endpoint is provided)
      let token, signature, expire
      
      // Only try authentication if endpoint is provided and not empty
      if (authenticationEndpoint && authenticationEndpoint.trim() !== '') {
        try {
          // Resolve relative URLs to absolute
          let authUrl = authenticationEndpoint
          if (authUrl.startsWith('/')) {
            // Relative URL - make it absolute using current origin
            authUrl = `${window.location.origin}${authUrl}`
          }
          
          const authResponse = await fetch(authUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (authResponse.ok) {
            const authData = await authResponse.json()
            token = authData.token
            signature = authData.signature
            // Ensure expire is a number
            expire = typeof authData.expire === 'number' ? authData.expire : parseInt(authData.expire, 10)
            
            if (!token || !signature || !expire || isNaN(expire)) {
              throw new Error('Invalid authentication response: missing or invalid fields')
            }
          } else {
            const errorText = await authResponse.text()
            throw new Error(`Authentication endpoint returned error: ${authResponse.status} - ${errorText}`)
          }
        } catch (authError) {
          console.error('Auth endpoint error:', authError)
          // ImageKit requires authentication - fail if we can't get it
          let errorMessage = t('image.authError') || 'שגיאה באימות. אנא ודא שהשרת פועל או הגדר את VITE_IMAGEKIT_AUTH_ENDPOINT בקובץ .env'
          
          if (authError.message && authError.message.includes('Failed to fetch')) {
            errorMessage = `לא ניתן להתחבר לשרת האימות (${authenticationEndpoint}). אנא ודא שהשרת פועל או הגדר את VITE_IMAGEKIT_AUTH_ENDPOINT בקובץ .env`
          } else if (authError.message) {
            errorMessage = authError.message
          }
          
          if (onError) {
            onError({
              message: errorMessage,
              error: authError
            })
          }
          setUploading(false)
          return
        }
      } else {
        // No endpoint provided - ImageKit requires auth
        const errorMessage = 'Authentication endpoint not configured. Please set VITE_IMAGEKIT_AUTH_ENDPOINT in .env file'
        console.error(errorMessage)
        if (onError) {
          onError({
            message: errorMessage,
            error: new Error('No authentication endpoint provided')
          })
        }
        setUploading(false)
        return
      }

      // Prepare form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', fileName || `upload-${Date.now()}`)
      formData.append('useUniqueFileName', 'true')
      formData.append('folder', folder)
      formData.append('publicKey', publicKey)
      
      // ImageKit requires authentication - fail if we don't have it
      if (!token || !signature || !expire) {
        throw new Error('Authentication failed: missing token, signature, or expire')
      }
      
      formData.append('token', token)
      formData.append('signature', signature)
      // expire must be a number (not string) for ImageKit
      formData.append('expire', expire)

      // Upload with progress tracking
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          setProgress(percentComplete)
          if (onProgress) {
            onProgress(percentComplete)
          }
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText)
            
            if (!response.filePath) {
              throw new Error('Upload succeeded but no filePath in response')
            }
            
            if (onSuccess) {
              onSuccess(response)
            }
          } catch (parseError) {
            console.error('Parse error:', parseError)
            if (onError) {
              onError({
                message: t('image.parseError') || 'שגיאה בפענוח התגובה',
                error: parseError,
                response: xhr.responseText
              })
            }
          }
        } else {
          let errorMessage = `Upload failed (${xhr.status})`
          try {
            const errorData = JSON.parse(xhr.responseText)
            errorMessage = errorData.message || errorData.error || errorMessage
            console.error('Upload error response:', errorData)
          } catch (e) {
            errorMessage = xhr.statusText || errorMessage
            console.error('Upload error (non-JSON):', xhr.responseText)
          }
          if (onError) {
            onError({
              message: errorMessage,
              status: xhr.status,
              response: xhr.responseText
            })
          }
        }
        setUploading(false)
        setProgress(0)
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        if (onError) {
          onError({
            message: t('image.uploadError') || 'שגיאה בהעלאת התמונה',
            status: xhr.status
          })
        }
        setUploading(false)
        setProgress(0)
      })

      // Send request
      xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload')
      xhr.send(formData)

    } catch (err) {
      console.error('Upload error:', err)
      if (onError) {
        onError({
          message: err.message || t('image.uploadError') || 'שגיאה בהעלאת התמונה',
          error: err
        })
      }
      setUploading(false)
      setProgress(0)
    }
  }

  // Expose file input for external triggers
  useEffect(() => {
    if (fileInputRef.current) {
      // Store reference globally for external access
      window._imageKitUploadInput = fileInputRef.current
    }
  }, [])

  return (
    <div className="imagekit-upload-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={uploading}
        className="imagekit-upload-input"
      />
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}

export default ImageKitUpload
