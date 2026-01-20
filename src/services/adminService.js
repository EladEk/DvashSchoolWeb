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

    // Try to save to Firebase (only changed keys for speed)
    try {
      await saveToFirebase(translations, !firebaseOnly) // onlyChanged = true unless firebaseOnly
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

// Track changed translation keys
const CHANGED_KEYS_STORAGE = 'admin_changed_keys'
let changedKeys = new Set()

// Load changed keys from storage
const loadChangedKeys = () => {
  try {
    const stored = localStorage.getItem(CHANGED_KEYS_STORAGE)
    if (stored) {
      changedKeys = new Set(JSON.parse(stored))
    }
  } catch (error) {
    console.error('Error loading changed keys:', error)
    changedKeys = new Set()
  }
}

// Save changed keys to storage
const saveChangedKeys = () => {
  try {
    localStorage.setItem(CHANGED_KEYS_STORAGE, JSON.stringify(Array.from(changedKeys)))
  } catch (error) {
    console.error('Error saving changed keys:', error)
  }
}

// Mark a translation key as changed
export const markKeyAsChanged = (translationKey) => {
  loadChangedKeys()
  changedKeys.add(translationKey)
  saveChangedKeys()
}

// Clear all changed keys
export const clearChangedKeys = () => {
  changedKeys.clear()
  localStorage.removeItem(CHANGED_KEYS_STORAGE)
}

// Get all changed keys
export const getChangedKeys = () => {
  loadChangedKeys()
  return Array.from(changedKeys)
}

// Helper function to set nested value in an object using dot notation for Firestore updates
// Firestore supports dot notation in field paths, so we can use it directly
const setNestedField = (obj, path, value) => {
  // For Firestore, we can use dot notation directly as field paths
  obj[path] = value
}

// Helper function to get nested value from an object using dot notation
const getNestedValue = (obj, path) => {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null) return undefined
    current = current[key]
  }
  return current
}

// Save only changed translations to Firebase (optimized)
export const saveToFirebase = async (translations, onlyChanged = true) => {
  try {
    // Import Firebase services
    const { db } = await import('./firebase')
    const { doc, updateDoc, setDoc } = await import('firebase/firestore')
    
    if (!db) {
      throw new Error('Firebase not configured')
    }
    
    if (onlyChanged) {
      loadChangedKeys()
      
      if (changedKeys.size === 0) {
        // Nothing changed, skip save
        return { success: true, skipped: true }
      }
      
      // Build update objects with only changed fields
      const heUpdates = {}
      const enUpdates = {}
      
      for (const key of changedKeys) {
        const heValue = getNestedValue(translations.he, key)
        const enValue = getNestedValue(translations.en, key)
        
        if (heValue !== undefined) {
          setNestedField(heUpdates, key, heValue)
        }
        if (enValue !== undefined) {
          setNestedField(enUpdates, key, enValue)
        }
      }
      
      // Use updateDoc with merge for partial updates (faster than setDoc)
      const promises = []
      
      if (Object.keys(heUpdates).length > 0) {
        promises.push(updateDoc(doc(db, 'translations', 'he'), heUpdates))
      }
      
      if (Object.keys(enUpdates).length > 0) {
        promises.push(updateDoc(doc(db, 'translations', 'en'), enUpdates))
      }
      
      if (promises.length > 0) {
        await Promise.all(promises)
      }
      
      // Store changed count before clearing
      const changedCount = changedKeys.size
      
      // Clear changed keys after successful save
      clearChangedKeys()
      
      return { success: true, changedCount }
    } else {
      // Fallback: save everything (for import/export scenarios)
      await setDoc(doc(db, 'translations', 'he'), translations.he, { merge: true })
      await setDoc(doc(db, 'translations', 'en'), translations.en, { merge: true })
      clearChangedKeys()
      return { success: true }
    }
  } catch (error) {
    // Firebase not configured or error
    throw error
  }
}
