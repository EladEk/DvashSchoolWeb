/**
 * Text Service - Manages site texts with dual-source architecture
 * 
 * Architecture:
 * - Production mode: Reads from /content/texts.json (GitHub) + Parliament from Firebase
 * - Edit mode: Reads/writes from Firebase (drafts, including Parliament)
 * - Parliament translations: In production, loaded from Firebase; in edit mode, from Firebase
 * 
 * IMPORTANT: 
 * - Parliament translations are NEVER saved to GitHub (excluded during publish)
 * - In production mode, Parliament translations are loaded from Firebase and merged
 * - In edit mode, everything (including Parliament) comes from Firebase
 */

// Cache for production texts
// NOTE: Cache duration is very short (30 seconds) to ensure fresh data from GitHub
// In production mode, we want to load from GitHub, not cache
let productionTextsCache = null
let productionTextsCacheTime = null
const PRODUCTION_CACHE_DURATION = 30 * 1000 // 30 seconds (very short to minimize cache issues)

/**
 * Check if we're in edit mode (admin mode)
 * @returns {boolean}
 */
export const isEditMode = () => {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem('adminAuthenticated') === 'true'
  } catch {
    return false
  }
}

/**
 * Check if a translation key is Parliament-related
 * @param {string} key - Translation key (e.g., 'parliament.title')
 * @returns {boolean}
 */
const isParliamentKey = (key) => {
  if (!key || typeof key !== 'string') return false
  const lowerKey = key.toLowerCase()
  return lowerKey.startsWith('parliament') || lowerKey.includes('.parliament')
}

/**
 * Remove Parliament-related keys from translations object
 * @param {object} translations - Translations object
 * @returns {object} Cleaned translations without Parliament data
 */
const excludeParliament = (translations) => {
  if (!translations || typeof translations !== 'object') {
    return translations
  }

  if (Array.isArray(translations)) {
    return translations.map(excludeParliament)
  }

  const cleaned = {}
  for (const key in translations) {
    // Skip Parliament-related keys
    if (isParliamentKey(key)) {
      continue
    }

    // Recursively clean nested objects
    if (translations[key] && typeof translations[key] === 'object') {
      const cleanedValue = excludeParliament(translations[key])
      // Only add if cleaned value is not empty
      if (cleanedValue && (typeof cleanedValue !== 'object' || Object.keys(cleanedValue).length > 0)) {
        cleaned[key] = cleanedValue
      }
    } else {
      cleaned[key] = translations[key]
    }
  }

  return cleaned
}

/**
 * Extract only Parliament-related keys from translations
 * @param {object} translations - Translations object
 * @returns {object} Only Parliament-related translations
 */
const extractParliament = (translations) => {
  if (!translations || typeof translations !== 'object') {
    return {}
  }

  if (Array.isArray(translations)) {
    return {}
  }

  const parliament = {}
  for (const key in translations) {
    // Include only Parliament-related keys
    if (isParliamentKey(key)) {
      if (translations[key] && typeof translations[key] === 'object') {
        parliament[key] = extractParliament(translations[key])
      } else {
        parliament[key] = translations[key]
      }
    } else if (translations[key] && typeof translations[key] === 'object') {
      // Recursively check nested objects
      const nestedParliament = extractParliament(translations[key])
      if (Object.keys(nestedParliament).length > 0) {
        parliament[key] = nestedParliament
      }
    }
  }

  return parliament
}

/**
 * Merge two translation objects (deep merge)
 * @param {object} target - Target object (GitHub data)
 * @param {object} source - Source object to merge in (Parliament from Firebase)
 * @returns {object} Merged object
 */
const mergeTranslations = (target, source) => {
  if (!source || typeof source !== 'object') {
    return target || {}
  }
  if (!target || typeof target !== 'object') {
    return source || {}
  }

  const merged = { ...target }
  for (const key in source) {
    // Skip if source value is null/undefined/empty
    if (source[key] == null) {
      continue
    }
    
    // For arrays, only overwrite if source has a non-empty array
    // Otherwise keep target array (preserves GitHub sections, etc.)
    if (Array.isArray(source[key])) {
      if (source[key].length > 0) {
        merged[key] = source[key]
      }
      // If source array is empty, keep target array (don't overwrite)
    } else if (source[key] && typeof source[key] === 'object') {
      // Recursive merge for nested objects
      merged[key] = mergeTranslations(target[key] || {}, source[key])
    } else {
      // For primitives, overwrite with source value
      merged[key] = source[key]
    }
  }

  return merged
}

/**
 * Load Parliament translations from Firebase
 * @returns {Promise<{he: object, en: object}>}
 */
const loadParliamentFromFirebase = async () => {
  try {
    const { loadTranslationsFromDB } = await import('./firebaseDB')
    const firebaseData = await loadTranslationsFromDB()

    if (!firebaseData) {
      return { he: {}, en: {} }
    }

    // Extract only Parliament-related translations
    return {
      he: extractParliament(firebaseData.he || {}),
      en: extractParliament(firebaseData.en || {})
    }
  } catch (error) {
    return { he: {}, en: {} }
  }
}

/**
 * Load texts from production source (GitHub JSON file)
 * Parliament translations are loaded from Firebase and merged
 * @returns {Promise<{he: object, en: object}>}
 */
const loadFromProduction = async () => {
  // In production mode, we want to load from GitHub, not cache
  // Cache check is minimal (30 seconds) to reduce repeated fetches during same session
  // but ensure fresh data from GitHub
  if (productionTextsCache && productionTextsCacheTime) {
    const age = Date.now() - productionTextsCacheTime
    if (age < PRODUCTION_CACHE_DURATION) {
      return productionTextsCache
    }
  }

  try {
    // Load from /content/texts.json (GitHub) - NOT from Firebase cache
    // Add cache-busting query parameter to ensure fresh fetch from GitHub
    const cacheBuster = `?t=${Date.now()}`
    const response = await fetch(`/content/texts.json${cacheBuster}`, {
      cache: 'no-store', // Don't cache - always fetch fresh from GitHub
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to load texts.json: ${response.status}`)
    }

    const texts = await response.json()

    // IMPORTANT: Exclude Parliament data from GitHub (defensive check)
    // Parliament should ONLY come from Firebase, never from GitHub
    const cleaned = {
      he: excludeParliament(texts.he || {}),
      en: excludeParliament(texts.en || {})
    }

    // Load Parliament translations from Firebase and merge
    // Parliament is the ONLY data that comes from Firebase in production mode
    const parliamentTranslations = await loadParliamentFromFirebase()
    
    // Merge: GitHub texts (non-Parliament) + Firebase Parliament
    const merged = {
      he: mergeTranslations(cleaned.he, parliamentTranslations.he),
      en: mergeTranslations(cleaned.en, parliamentTranslations.en)
    }

    // Cache the result
    productionTextsCache = merged
    productionTextsCacheTime = Date.now()

    return merged
  } catch (error) {
    
    // Return cached data if available (even if expired)
    if (productionTextsCache) {
      return productionTextsCache
    }

    // Fallback to default translations
    return await getDefaultTranslations()
  }
}

/**
 * Load default translations from local JSON files
 * @returns {Promise<{he: object, en: object}>}
 */
const getDefaultTranslations = async () => {
  try {
    const [heTranslations, enTranslations] = await Promise.all([
      import('../translations/he.json'),
      import('../translations/en.json')
    ])

    // Exclude Parliament from defaults too
    return {
      he: excludeParliament(heTranslations.default || heTranslations),
      en: excludeParliament(enTranslations.default || enTranslations)
    }
  } catch (error) {
    return { he: {}, en: {} }
  }
}

/**
 * Load texts from Firebase (edit mode)
 * In edit mode, includes everything including Parliament
 * @returns {Promise<{he: object, en: object}>}
 */
const loadFromFirebase = async () => {
  try {
    const { loadTranslationsFromDB } = await import('./firebaseDB')
    const firebaseData = await loadTranslationsFromDB()

    if (!firebaseData) {
      // Fallback to production or defaults
      return await loadFromProduction()
    }

    // In edit mode, return everything including Parliament
    return {
      he: firebaseData.he || {},
      en: firebaseData.en || {}
    }
  } catch (error) {
    // Fallback to production
    return await loadFromProduction()
  }
}

/**
 * Main function to load texts based on current mode
 * @param {boolean} forceRefresh - Force refresh from source (bypass cache)
 * @returns {Promise<{he: object, en: object}>}
 */
export const loadTexts = async (forceRefresh = false) => {
  // Clear cache if forcing refresh
  if (forceRefresh) {
    productionTextsCache = null
    productionTextsCacheTime = null
  }

  // In edit mode, load from Firebase (drafts)
  if (isEditMode()) {
    // In edit mode, load from Firebase (drafts)
    return await loadFromFirebase()
  }

  // In production mode, load from GitHub JSON (NOT Firebase, except Parliament)
  return await loadFromProduction()
}

/**
 * Save texts to Firebase (edit mode only)
 * @param {object} translations - {he: object, en: object}
 * @returns {Promise<{success: boolean}>}
 */
export const saveTexts = async (translations) => {
  // Only allow saving in edit mode
  if (!isEditMode()) {
    throw new Error('Cannot save texts outside of edit mode')
  }

  // IMPORTANT: Exclude Parliament data before saving
  const cleaned = {
    he: excludeParliament(translations.he || {}),
    en: excludeParliament(translations.en || {})
  }

  try {
    const { saveAllTranslationsToDB } = await import('./firebaseDB')
    await saveAllTranslationsToDB(cleaned)
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Save a single translation key (edit mode only)
 * @param {string} translationKey - Translation key path (e.g., 'about.title')
 * @param {string} hebrewValue - Hebrew value
 * @param {string} englishValue - English value
 * @returns {Promise<{success: boolean}>}
 */
export const saveTranslation = async (translationKey, hebrewValue, englishValue) => {
  // Only allow saving in edit mode
  if (!isEditMode()) {
    throw new Error('Cannot save translations outside of edit mode')
  }

  // IMPORTANT: Block Parliament-related keys
  if (isParliamentKey(translationKey)) {
    throw new Error('Parliament translations cannot be saved through this service')
  }

  try {
    const { saveTranslationToDB } = await import('./firebaseDB')
    await saveTranslationToDB(translationKey, hebrewValue, englishValue)
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Publish texts from Firebase to GitHub
 * @param {string} commitMessage - Optional commit message
 * @returns {Promise<{success: boolean, commit?: object}>}
 */
// Track if publish is in progress to prevent multiple simultaneous publishes
let isPublishing = false

export const publishTexts = async (commitMessage) => {
  // Only allow publishing in edit mode
  if (!isEditMode()) {
    throw new Error('Cannot publish texts outside of edit mode')
  }

  // Prevent multiple simultaneous publishes
  if (isPublishing) {
    throw new Error('Publish already in progress. Please wait for the current publish to complete.')
  }

  isPublishing = true
  
  try {
    // Get Firebase Auth token (if available)
    const authToken = localStorage.getItem('firebaseAuthToken') || 
                     sessionStorage.getItem('firebaseAuthToken')

    const apiEndpoint = process.env.NODE_ENV === 'development' 
      ? '/api/publish-texts-local'
      : '/api/publish-texts'
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify({
        commitMessage: commitMessage || `Update site texts - ${new Date().toISOString()}`
      })
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: `HTTP ${response.status}`, message: await response.text().catch(() => 'Unknown error') }
      }
      
      const errorMessage = errorData.message || errorData.error || errorData.details || `Publish failed: ${response.status}`
      const error = new Error(errorMessage)
      error.status = response.status
      error.details = errorData
      throw error
    }

    const result = await response.json()

    // Clear production cache so next load gets fresh data
    productionTextsCache = null
    productionTextsCacheTime = null

    return result
  } catch (error) {
    throw error
  } finally {
    // Always reset the publishing flag, even on error
    isPublishing = false
  }
}

/**
 * Clear all caches
 */
export const clearCache = () => {
  productionTextsCache = null
  productionTextsCacheTime = null
}

// Export for backward compatibility
export default {
  loadTexts,
  saveTexts,
  saveTranslation,
  publishTexts,
  isEditMode,
  clearCache
}
