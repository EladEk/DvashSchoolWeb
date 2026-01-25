/**
 * Text Service - Manages site texts with dual-source architecture
 * 
 * Architecture:
 * - Production mode: Reads from /content/texts.json (GitHub)
 * - Edit mode: Reads/writes from Firebase (drafts)
 * - Parliament page: Completely excluded from this system
 * 
 * IMPORTANT: Parliament-related translations are NEVER loaded or saved
 * through this service. The Parliament page manages its own content.
 */

// Cache for production texts
let productionTextsCache = null
let productionTextsCacheTime = null
const PRODUCTION_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
 * Load texts from production source (GitHub JSON file)
 * @returns {Promise<{he: object, en: object}>}
 */
const loadFromProduction = async () => {
  // Check cache first
  if (productionTextsCache && productionTextsCacheTime) {
    const age = Date.now() - productionTextsCacheTime
    if (age < PRODUCTION_CACHE_DURATION) {
      return productionTextsCache
    }
  }

  try {
    // Load from /content/texts.json
    const response = await fetch('/content/texts.json', {
      cache: 'no-cache', // Always fetch fresh in production
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to load texts.json: ${response.status}`)
    }

    const texts = await response.json()

    // IMPORTANT: Exclude Parliament data (defensive check)
    const cleaned = {
      he: excludeParliament(texts.he || {}),
      en: excludeParliament(texts.en || {})
    }

    // Cache the result
    productionTextsCache = cleaned
    productionTextsCacheTime = Date.now()

    return cleaned
  } catch (error) {
    console.error('Error loading production texts:', error)
    
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
    console.error('Error loading default translations:', error)
    return { he: {}, en: {} }
  }
}

/**
 * Load texts from Firebase (edit mode)
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

    // IMPORTANT: Exclude Parliament data from Firebase too
    const cleaned = {
      he: excludeParliament(firebaseData.he || {}),
      en: excludeParliament(firebaseData.en || {})
    }

    return cleaned
  } catch (error) {
    console.error('Error loading from Firebase:', error)
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

  // In edit mode, load from Firebase
  if (isEditMode()) {
    return await loadFromFirebase()
  }

  // In production mode, load from GitHub JSON
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
    console.error('Error saving texts to Firebase:', error)
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
    console.error('Error saving translation:', error)
    throw error
  }
}

/**
 * Publish texts from Firebase to GitHub
 * @param {string} commitMessage - Optional commit message
 * @returns {Promise<{success: boolean, commit?: object}>}
 */
export const publishTexts = async (commitMessage) => {
  // Only allow publishing in edit mode
  if (!isEditMode()) {
    throw new Error('Cannot publish texts outside of edit mode')
  }

  try {
    // Get Firebase Auth token (if available)
    const authToken = localStorage.getItem('firebaseAuthToken') || 
                     sessionStorage.getItem('firebaseAuthToken')

    const response = await fetch('/api/publish-texts', {
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
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `Publish failed: ${response.status}`)
    }

    const result = await response.json()

    // Clear production cache so next load gets fresh data
    productionTextsCache = null
    productionTextsCacheTime = null

    return result
  } catch (error) {
    console.error('Error publishing texts:', error)
    throw error
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
