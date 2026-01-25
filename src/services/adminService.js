// Admin service for managing translations
// This service now delegates to textService for the new architecture:
// - Production: Reads from /content/texts.json (GitHub)
// - Edit mode: Reads/writes from Firebase (drafts)
// - Parliament: Completely excluded

// This file maintains backward compatibility for admin dashboard components
// while using the new textService under the hood

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

// Load translations using new textService
// This maintains backward compatibility while using the new architecture
export const getTranslations = async (skipFirebase = false) => {
  try {
    // Use new textService which handles production vs edit mode automatically
    // skipFirebase parameter is ignored - textService handles caching internally
    const { loadTexts } = await import('./textService')
    const translations = await loadTexts(!skipFirebase) // forceRefresh = !skipFirebase
    
    // Update cache for backward compatibility
    translationsCache = translations
    
    // Also update localStorage for backward compatibility
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(translations))
    } catch (e) {
      // localStorage might be full, ignore
    }
    
    return translations
  } catch (error) {
    console.error('Error loading translations:', error)
    // Fallback to cached or defaults
    if (translationsCache) {
      return translationsCache
    }
    return await getDefaultTranslations()
  }
}

// Save translations using new textService
// This maintains backward compatibility while using the new architecture
export const saveTranslations = async (translations, firebaseOnly = false) => {
  try {
    // Use new textService which handles edit mode check and Parliament exclusion
    const { saveTexts, isEditMode } = await import('./textService')
    
    // Check if we're in edit mode
    if (!isEditMode()) {
      throw new Error('Cannot save translations outside of edit mode')
    }

    // Update cache immediately
    translationsCache = translations

    // Save to localStorage for backward compatibility (fast, synchronous)
    if (!firebaseOnly) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(translations))
      } catch (e) {
        // localStorage might be full, continue anyway
      }
    }

    // Save to Firebase using textService (handles Parliament exclusion automatically)
    await saveTexts(translations)

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

// Deep merge function to properly merge nested objects
const deepMerge = (target, source) => {
  if (!source || typeof source !== 'object') {
    return target
  }
  
  const result = { ...target }
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        // Recursively merge nested objects
        result[key] = deepMerge(target[key], source[key])
      } else {
        // Overwrite with source value (or set if doesn't exist)
        result[key] = source[key]
      }
    }
  }
  
  return result
}

// Load translations from Firebase (when configured)
export const loadFromFirebase = async () => {
  try {
    const { loadTranslationsFromDB } = await import('./firebaseDB')
    const firebaseData = await loadTranslationsFromDB()
    
    if (firebaseData) {
      // Deep merge with defaults to ensure all keys exist
      const defaults = await getDefaultTranslations()
      const merged = {
        he: deepMerge(defaults.he || {}, firebaseData.he || {}),
        en: deepMerge(defaults.en || {}, firebaseData.en || {})
      }
      return merged
    }
    
    return null
  } catch (error) {
    // Firebase not configured or error - silently fail
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
    const { saveAllTranslationsToDB } = await import('./firebaseDB')
    
    if (onlyChanged) {
      loadChangedKeys()
      
      if (changedKeys.size === 0) {
        // Nothing changed, skip save
        return { success: true, skipped: true }
      }
      
      // Store changed count before clearing
      const changedCount = changedKeys.size
      
      // Save all translations (FirebaseDB will handle optimization)
      await saveAllTranslationsToDB(translations)
      
      // Clear changed keys after successful save
      clearChangedKeys()
      
      return { success: true, changedCount }
    } else {
      // Save everything (for import/export scenarios)
      await saveAllTranslationsToDB(translations)
      clearChangedKeys()
      return { success: true }
    }
  } catch (error) {
    // Firebase not configured or error
    throw error
  }
}
