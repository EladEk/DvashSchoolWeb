// Admin service for managing translations
// This service handles loading, saving, and exporting translations

// For now, we'll use localStorage as a temporary storage
// In production, this should connect to Firebase Firestore

const STORAGE_KEY = 'admin_translations'

// Cache for translations to avoid repeated loads
let translationsCache = null
let defaultTranslationsCache = null

// Load default translations (cached)
export const getDefaultTranslations = async () => {
  if (defaultTranslationsCache) {
    return defaultTranslationsCache
  }
  
  try {
    const heTranslations = await import('../translations/he.json')
    const enTranslations = await import('../translations/en.json')
    defaultTranslationsCache = {
      he: heTranslations.default,
      en: enTranslations.default
    }
    return defaultTranslationsCache
  } catch (error) {
    console.error('Error loading default translations:', error)
    return { he: {}, en: {} }
  }
}

// Load translations from storage or fallback to default (optimized for speed)
export const getTranslations = async (skipFirebase = false) => {
  // Return cached translations if available (for quick access)
  if (translationsCache && skipFirebase) {
    return translationsCache
  }

  try {
    // Try to load from localStorage first (fastest)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      translationsCache = parsed
      return parsed
    }

    // Try Firebase only if not skipped (can be slow)
    if (!skipFirebase) {
      try {
        // Add timeout for Firebase operations
        const firebasePromise = loadFromFirebase()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase timeout')), 2000)
        )
        
        const firebaseTranslations = await Promise.race([firebasePromise, timeoutPromise])
        if (firebaseTranslations) {
          translationsCache = firebaseTranslations
          return firebaseTranslations
        }
      } catch (firebaseError) {
        // Firebase timeout or error - continue to defaults
        console.log('Firebase not available or timeout:', firebaseError.message)
      }
    }

    // Fallback to default translations (cached)
    const defaults = await getDefaultTranslations()
    translationsCache = defaults
    return defaults
  } catch (error) {
    console.error('Error loading translations:', error)
    // Return cached defaults or empty structure
    return defaultTranslationsCache || { he: {}, en: {} }
  }
}

// Save translations to storage (and Firebase if configured)
export const saveTranslations = async (translations, firebaseOnly = false) => {
  try {
    // Update cache immediately
    translationsCache = translations

    // Save to localStorage first (fast, synchronous)
    if (!firebaseOnly) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(translations))
    }

    // Try to save to Firebase
    try {
      await saveToFirebase(translations)
    } catch (firebaseError) {
      // Firebase not configured or error
      console.log('Firebase save failed:', firebaseError.message)
      if (firebaseOnly) {
        // If firebaseOnly is true, we must throw the error
        throw firebaseError
      }
      // Otherwise, continue - localStorage save already succeeded
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving translations:', error)
    throw error
  }
}

// Clear cache (useful when translations are updated externally)
export const clearTranslationsCache = () => {
  translationsCache = null
}

// Export translations as downloadable JSON files
export const exportTranslations = (translations) => {
  const heData = JSON.stringify(translations.he, null, 2)
  const enData = JSON.stringify(translations.en, null, 2)

  // Create download links
  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  downloadFile(heData, 'he.json')
  setTimeout(() => {
    downloadFile(enData, 'en.json')
  }, 100)
}

// Load translations from Firebase (when configured)
export const loadFromFirebase = async () => {
  try {
    // Import Firebase services
    const { db } = await import('./firebase')
    const { doc, getDoc } = await import('firebase/firestore')
    
    if (!db) {
      return null
    }
    
    const heDoc = await getDoc(doc(db, 'translations', 'he'))
    const enDoc = await getDoc(doc(db, 'translations', 'en'))
    
    if (heDoc.exists() || enDoc.exists()) {
      return {
        he: heDoc.exists() ? heDoc.data() : {},
        en: enDoc.exists() ? enDoc.data() : {}
      }
    }
    
    return null
  } catch (error) {
    // Firebase not configured or error - silently fail
    console.log('Firebase translations not available:', error.message)
    return null
  }
}

// Save translations to Firebase (when configured)
export const saveToFirebase = async (translations) => {
  try {
    // Import Firebase services
    const { db } = await import('./firebase')
    const { doc, setDoc } = await import('firebase/firestore')
    
    if (!db) {
      throw new Error('Firebase not configured')
    }
    
    await setDoc(doc(db, 'translations', 'he'), translations.he)
    await setDoc(doc(db, 'translations', 'en'), translations.en)
    
    return { success: true }
  } catch (error) {
    // Firebase not configured or error
    throw error
  }
}
