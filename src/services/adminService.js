// Admin service for managing translations
// This service handles loading, saving, and exporting translations

// For now, we'll use localStorage as a temporary storage
// In production, this should connect to Firebase Firestore

const STORAGE_KEY = 'admin_translations'

// Load translations from storage or fallback to default
export const getTranslations = async () => {
  try {
    // Try to load from Firebase first (if configured)
    const firebaseTranslations = await loadFromFirebase()
    if (firebaseTranslations) {
      return firebaseTranslations
    }

    // Try to load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }

    // Fallback to importing JSON files
    const heTranslations = await import('../translations/he.json')
    const enTranslations = await import('../translations/en.json')

    return {
      he: heTranslations.default,
      en: enTranslations.default
    }
  } catch (error) {
    console.error('Error loading translations:', error)
    // Return empty structure if all fails
    return { he: {}, en: {} }
  }
}

// Save translations to storage (and Firebase if configured)
export const saveTranslations = async (translations, firebaseOnly = false) => {
  try {
    // Try to save to Firebase first (if configured)
    try {
      await saveToFirebase(translations)
    } catch (firebaseError) {
      // Firebase not configured or error
      console.log('Firebase not available:', firebaseError.message)
      if (firebaseOnly) {
        throw firebaseError
      }
    }

    // Also save to localStorage as backup (unless we only want Firebase)
    if (!firebaseOnly) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(translations))
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving translations:', error)
    throw error
  }
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
