/**
 * Text System - Single module that manages all site texts.
 *
 * Edit mode:  DB (Firebase) first; if a key is missing in DB → src/translations.
 *             If DB is empty or errors → src/translations only (no Git).
 *
 * Publish mode (not edit): Git (content/texts.json) first; Parliament from Firebase.
 *             If a key is missing in Git → src/translations.
 *             If Git fetch fails → src/translations only.
 *
 * This module owns: load source (content vs Firebase), defaults merge, Parliament
 * exclude/merge, and all public API.
 */

import heTranslations from '../translations/he.json'
import enTranslations from '../translations/en.json'
import * as cache from './cacheService'

/** Fallback translations (keys not in content/texts.json). Loaded content wins. */
const DEFAULTS = { he: heTranslations, en: enTranslations }

/** TTL: public (Git) 5 min, edit (DB) 2 min */
const CACHE_TTL_PUBLIC_MS = 5 * 60 * 1000
const CACHE_TTL_EDIT_MS = 2 * 60 * 1000

/** Deep merge: source wins. Used to merge defaults (target) + loaded (source). */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target || {}
  if (!target || typeof target !== 'object') return source || {}
  const result = { ...target }
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue
    const s = source[key]
    const t = target[key]
    if (s && typeof s === 'object' && !Array.isArray(s) && t && typeof t === 'object' && !Array.isArray(t)) {
      result[key] = deepMerge(t, s)
    } else {
      result[key] = s
    }
  }
  return result
}

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
 * Parliament translations are loaded from Firebase and merged.
 * Uses website cache (public mode) to avoid repeated Git/DB calls.
 */
const loadFromProduction = async () => {
  const cached = cache.get('texts', 'public')
  if (cached != null && typeof cached === 'object' && (cached.he != null || cached.en != null)) {
    return cached
  }

  try {
    const cacheBuster = `?t=${Date.now()}`
    const response = await fetch(`/content/texts.json${cacheBuster}`, {
      cache: 'no-store',
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
    const cleaned = {
      he: excludeParliament(texts.he || {}),
      en: excludeParliament(texts.en || {})
    }
    const parliamentTranslations = await loadParliamentFromFirebase()
    const merged = {
      he: mergeTranslations(cleaned.he, parliamentTranslations.he),
      en: mergeTranslations(cleaned.en, parliamentTranslations.en)
    }

    cache.set('texts', merged, 'public', CACHE_TTL_PUBLIC_MS)
    return merged
  } catch (error) {
    const fallback = cache.get('texts', 'public')
    if (fallback != null && typeof fallback === 'object') return fallback
    return await getDefaultTranslations()
  }
}

/** Return default fallback translations (used when load fails). */
export const getDefaultTranslations = async () => DEFAULTS

/**
 * Load texts from Firebase (edit mode).
 * Uses website cache (edit mode) to avoid repeated DB calls when re-entering edit mode.
 */
const loadFromFirebase = async () => {
  const cached = cache.get('texts', 'edit')
  if (cached != null && typeof cached === 'object' && (cached.he != null || cached.en != null)) {
    return { he: cached.he || {}, en: cached.en || {} }
  }

  try {
    const { loadTranslationsFromDB } = await import('./firebaseDB')
    const firebaseData = await loadTranslationsFromDB()
    const data = firebaseData
      ? { he: firebaseData.he || {}, en: firebaseData.en || {} }
      : { he: {}, en: {} }
    cache.set('texts', data, 'edit', CACHE_TTL_EDIT_MS)
    return data
  } catch (error) {
    return { he: {}, en: {} }
  }
}

/**
 * Load texts: content/texts.json wins in publish, Firebase wins in edit.
 * Uses website cache per mode so switching edit on/off does not hit DB/Git every time.
 * @param {boolean} forceRefresh - Bypass cache and load from source
 * @returns {Promise<{he: object, en: object}>} Merged { he, en }
 */
export const loadTexts = async (forceRefresh = false) => {
  const mode = isEditMode() ? 'edit' : 'public'
  if (forceRefresh) {
    cache.clearKey('texts', mode)
  }

  try {
    const raw = isEditMode() ? await loadFromFirebase() : await loadFromProduction()
    return {
      he: deepMerge(DEFAULTS.he, raw?.he || {}),
      en: deepMerge(DEFAULTS.en, raw?.en || {})
    }
  } catch (error) {
    console.error('Text system load error:', error)
    return DEFAULTS
  }
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
    cache.set('texts', { he: translations.he || {}, en: translations.en || {} }, 'edit', CACHE_TTL_EDIT_MS)
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
    cache.clearMode('public')
    return result
  } catch (error) {
    throw error
  } finally {
    // Always reset the publishing flag, even on error
    isPublishing = false
  }
}

/** Clear public (publish) cache so next load gets fresh Git data. Called after publish. */
export const clearCache = () => {
  cache.clearMode('public')
}

/** Default/fallback translations. Use when load fails or for offline fallback. */
export const getDefaults = () => DEFAULTS

export default {
  loadTexts,
  saveTexts,
  saveTranslation,
  publishTexts,
  isEditMode,
  clearCache,
  getDefaults,
  getDefaultTranslations
}
