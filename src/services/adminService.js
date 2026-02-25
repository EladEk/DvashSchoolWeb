// Admin service – delegates all text logic to the text system (textService).
// This file keeps the same API for admin components; the single text system owns
// content/texts.json vs Firebase, defaults, and merge.

import * as websiteCache from './cacheService'

const STORAGE_KEY = 'admin_translations'
let translationsCache = null
let defaultTranslationsCache = null

export const getDefaultTranslations = async () => {
  if (defaultTranslationsCache) return defaultTranslationsCache
  const textSystem = await import('./textService')
  defaultTranslationsCache = await textSystem.getDefaultTranslations()
  return defaultTranslationsCache
}

export const getTranslations = async (skipFirebase = false, forceRefresh = false) => {
  try {
    const { loadTexts, isEditMode } = await import('./textService')
    const shouldRefresh = forceRefresh || !isEditMode()
    const translations = await loadTexts(shouldRefresh)
    translationsCache = translations
    if (isEditMode()) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(translations))
      } catch (e) {}
    }
    return translations
  } catch (error) {
    console.error('Error loading translations:', error)
    if (translationsCache) return translationsCache
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

export const clearTranslationsCache = () => {
  translationsCache = null
  defaultTranslationsCache = null
  // Keep behavior aligned with "Clear Site Cache" button in edit mode:
  // remove both public/edit website caches immediately after save.
  websiteCache.clearAll()
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
