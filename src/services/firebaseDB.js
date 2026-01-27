// Centralized Firebase Database Operations

import { db } from './firebase'
import { 
  doc, 
  getDoc, 
  getDocs,
  updateDoc, 
  setDoc, 
  writeBatch,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  limit
} from 'firebase/firestore'

// ============================================
// CACHE MANAGEMENT
// ============================================

// Cache storage keys
const CACHE_KEYS = {
  PARLIAMENT_DATES: 'firebase_cache_parliament_dates',
  PARLIAMENT_SUBJECTS: 'firebase_cache_parliament_subjects',
  PARLIAMENT_NOTES: 'firebase_cache_parliament_notes_', // suffix with subjectId
  USERS: 'firebase_cache_users',
  IMAGES: 'firebase_cache_images_', // suffix with imageKey
}

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

// In-memory cache for faster access
const memoryCache = new Map()
const memoryCacheTime = new Map()

/**
 * Get data from cache (localStorage + memory)
 * @param {string} cacheKey - Cache key
 * @param {boolean} checkMemory - Whether to check memory cache first
 * @param {number} cacheDuration - Custom cache duration in milliseconds (defaults to CACHE_DURATION)
 * @returns {any|null} Cached data or null
 */
const getFromCache = (cacheKey, checkMemory = true, cacheDuration = CACHE_DURATION) => {
  if (checkMemory) {
    const cached = memoryCache.get(cacheKey)
    const cacheTime = memoryCacheTime.get(cacheKey)
    if (cached !== undefined && cacheTime) {
      const age = Date.now() - cacheTime
      if (age < cacheDuration) {
        return cached
      } else {
        memoryCache.delete(cacheKey)
        memoryCacheTime.delete(cacheKey)
      }
    }
  }

  // Check localStorage
  try {
    const stored = localStorage.getItem(cacheKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && parsed.data !== undefined && parsed.timestamp) {
        const age = Date.now() - parsed.timestamp
        if (age < cacheDuration) {
          memoryCache.set(cacheKey, parsed.data)
          memoryCacheTime.set(cacheKey, parsed.timestamp)
          return parsed.data
        } else {
          localStorage.removeItem(cacheKey)
        }
      }
    }
  } catch (error) {
  }

  return null
}

/**
 * Save data to cache (localStorage + memory)
 * @param {string} cacheKey - Cache key
 * @param {any} data - Data to cache
 */
const saveToCache = (cacheKey, data) => {
  const timestamp = Date.now()
  
  memoryCache.set(cacheKey, data)
  memoryCacheTime.set(cacheKey, timestamp)
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp
    }))
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      clearOldCache()
    }
  }
}

/**
 * Clear cache for a specific key
 * @param {string} cacheKey - Cache key to clear
 */
const clearCache = (cacheKey) => {
  memoryCache.delete(cacheKey)
  memoryCacheTime.delete(cacheKey)
  try {
    localStorage.removeItem(cacheKey)
  } catch (error) {
  }
}

/**
 * Clear old cache entries (older than CACHE_DURATION)
 */
const clearOldCache = () => {
  const now = Date.now()
  const keysToRemove = []
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('firebase_cache_')) {
        try {
          const stored = localStorage.getItem(key)
          if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.timestamp && (now - parsed.timestamp) >= CACHE_DURATION) {
              keysToRemove.push(key)
            }
          }
        } catch (e) {
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      memoryCache.delete(key)
      memoryCacheTime.delete(key)
    })
  } catch (error) {
  }
}

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  memoryCache.clear()
  memoryCacheTime.clear()
  
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('firebase_cache_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
  }
}

/**
 * Clear all image caches (used when entering/exiting edit mode so images reload from correct source).
 */
export const clearAllImageCaches = () => {
  const prefix = CACHE_KEYS.IMAGES
  const keysToRemove = []
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) keysToRemove.push(key)
  }
  keysToRemove.forEach(key => {
    memoryCache.delete(key)
    memoryCacheTime.delete(key)
  })
  try {
    const locKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) locKeys.push(key)
    }
    locKeys.forEach(key => localStorage.removeItem(key))
  } catch (error) {
  }
}

// ============================================
// TRANSLATIONS OPERATIONS
// ============================================

/**
 * Load translations from Firebase
 * @returns {Promise<{he: object, en: object} | null>}
 */
export const loadTranslationsFromDB = async () => {
  try {
    if (!db) {
      return null
    }
    
    const translationsRef = collection(db, 'translations')
    const snapshot = await getDocs(translationsRef)
    
    const translations = { he: {}, en: {} }
    snapshot.forEach((docSnap) => {
      const lang = docSnap.id
      if (lang === 'he' || lang === 'en') {
        translations[lang] = docSnap.data()
      }
    })
    
    if (translations.he && Object.keys(translations.he).length > 0 || 
        translations.en && Object.keys(translations.en).length > 0) {
      return translations
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Build nested update object from translation key path
 * @param {string} translationKey - Dot-separated key path (e.g., 'about.title')
 * @param {any} value - Value to set
 * @returns {object} Nested update object
 */
const buildNestedUpdate = (translationKey, value) => {
  const keys = translationKey.split('.')
  const update = {}
  let current = update
  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = {}
    current = current[keys[i]]
  }
  current[keys[keys.length - 1]] = value
  return update
}

/**
 * Save a single translation to Firebase
 * @param {string} translationKey - Translation key path (e.g., 'about.title')
 * @param {string} hebrewValue - Hebrew value
 * @param {string} englishValue - English value
 * @returns {Promise<{success: boolean}>}
 */
export const saveTranslationToDB = async (translationKey, hebrewValue, englishValue) => {
  try {
    if (!db) {
      throw new Error('Firebase not configured')
    }
    
    const heUpdate = buildNestedUpdate(translationKey, hebrewValue)
    const enUpdate = buildNestedUpdate(translationKey, englishValue)
    
    const batch = writeBatch(db)
    const heDocRef = doc(db, 'translations', 'he')
    const enDocRef = doc(db, 'translations', 'en')
    
    batch.set(heDocRef, heUpdate, { merge: true })
    batch.set(enDocRef, enUpdate, { merge: true })
    
    const commitPromise = batch.commit()
    const timeoutPromise = new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Firebase save timeout - client may be offline'))
      }, 10000)
      commitPromise.finally(() => clearTimeout(timeoutId))
    })
    
    await Promise.race([commitPromise, timeoutPromise])
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Remove undefined values from an object recursively
 * Firebase doesn't accept undefined values
 */
const removeUndefined = (obj) => {
  if (obj === null || obj === undefined) {
    return null
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)).filter(item => item !== null && item !== undefined)
  }
  
  if (typeof obj !== 'object') {
    return obj
  }
  
  const cleaned = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = removeUndefined(obj[key])
      // Only include the key if the value is not undefined
      if (value !== undefined) {
        cleaned[key] = value
      }
    }
  }
  
  return cleaned
}

/**
 * Save all translations to Firebase (for import/export)
 * @param {object} translations - {he: object, en: object}
 * @returns {Promise<{success: boolean}>}
 */
export const saveAllTranslationsToDB = async (translations) => {
  try {
    if (!db) {
      throw new Error('Firebase not configured')
    }
    
    // Remove undefined values before saving (Firebase doesn't accept undefined)
    const cleanedHe = removeUndefined(translations.he || {})
    const cleanedEn = removeUndefined(translations.en || {})
    
    // Use merge to update without overwriting
    await Promise.all([
      setDoc(doc(db, 'translations', 'he'), cleanedHe, { merge: true }),
      setDoc(doc(db, 'translations', 'en'), cleanedEn, { merge: true })
    ])
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

// ============================================
// CONTACT FORM OPERATIONS
// ============================================

/**
 * Submit contact form to Firebase
 * @param {object} formData - {firstName, lastName, email, message}
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const submitContactFormToDB = async (formData) => {
  try {
    if (!db) {
      throw new Error('Firebase not configured')
    }
    
    const docRef = await addDoc(collection(db, 'contacts'), {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      message: formData.message,
      timestamp: serverTimestamp(),
    })
    
    return { success: true, id: docRef.id }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ============================================
// IMAGE OPERATIONS
// ============================================

/**
 * Save image path (ImageKit URL) to Firebase Firestore
 * Images are stored in ImageKit, only the path/URL is saved in Firebase
 * Updates cache after save
 * @param {string} imageKey - Image key (e.g., 'hero.image', 'about.image1')
 * @param {string|null} imagePath - ImageKit path/URL or null to delete
 * @returns {Promise<{success: boolean}>}
 */
/**
 * Normalize image path: extract path from full URL if needed
 * Always returns just the path (e.g., "/school-website/image.jpg")
 * Removes ImageKit endpoint ID if present (extracts path after endpoint)
 * @param {string} imagePathOrUrl - Full URL or path
 * @returns {string|null} Normalized path or null
 */
const normalizeImagePath = (imagePathOrUrl) => {
  if (!imagePathOrUrl) return null
  
  let path = imagePathOrUrl
  
  // If it's a full URL, extract the path
  if (path.startsWith('http')) {
    try {
      const url = new URL(path)
      path = url.pathname
    } catch {
      // If URL parsing fails, try to extract path manually
      const match = path.match(/\/school-website\/.+$/)
      if (match) {
        path = match[0]
      }
    }
  }
  
  // Extract the actual path after any endpoint ID
  // ImageKit paths typically have structure: /{endpoint_id}/school-website/...
  // We want to extract: /school-website/...
  if (path.includes('/school-website/')) {
    const match = path.match(/\/school-website\/.+$/)
    if (match) {
      path = match[0]
    }
  }
  
  // Ensure path starts with / (if it's a valid path)
  if (path && !path.startsWith('/') && path.includes('/')) {
    // If path doesn't start with / but contains /, it might be missing the leading slash
    // Only add it if it looks like a path (contains /school-website/)
    if (path.includes('/school-website/')) {
      path = '/' + path
    }
  }
  
  return path || null
}

export const saveImagePathToDB = async (imageKey, imagePath) => {
  try {
    if (!db) {
      throw new Error('Firebase not configured')
    }
    
    // Normalize path: always save path only, not full URL
    const normalizedPath = normalizeImagePath(imagePath)
    
    const imageDocRef = doc(db, 'images', imageKey)
    
    if (normalizedPath === null) {
      // Delete the image reference
      await updateDoc(imageDocRef, {
        path: null,
        updatedAt: serverTimestamp(),
      })
    } else {
      // Save or update the ImageKit path (path only, not full URL)
      await setDoc(imageDocRef, {
        path: normalizedPath, // Always save path only
        updatedAt: serverTimestamp(),
      }, { merge: true })
    }
    
    // Update cache immediately (with normalized path)
    const cacheKey = `${CACHE_KEYS.IMAGES}${imageKey}`
    saveToCache(cacheKey, normalizedPath)
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Load image path (ImageKit URL) from Firebase or GitHub JSON
 * In production mode: loads from /content/texts.json
 * In edit mode: loads from Firebase
 * @param {string} imageKey - Image key
 * @param {boolean} forceRefresh - If true, bypass cache and fetch from source
 * @returns {Promise<string|null>} ImageKit path/URL or null
 */
export const loadImagePathFromDB = async (imageKey, forceRefresh = false) => {
  if (!imageKey) {
    return null
  }
  
  // Check if we're in edit mode
  const isEditMode = () => {
    if (typeof window === 'undefined') return false
    try {
      return sessionStorage.getItem('adminAuthenticated') === 'true'
    } catch {
      return false
    }
  }
  
  const cacheKey = `${CACHE_KEYS.IMAGES}${imageKey}`
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey)
    if (cached !== null) {
      return cached
    }
  }
  
  // In production mode, load from GitHub JSON file
  if (!isEditMode()) {
    try {
      // Load texts.json with cache-busting to ensure fresh fetch from GitHub
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
      
      // Check if images are stored in texts.json
      // Structure: { he: {...}, en: {...}, images: { "hero.image": "/path/to/image.jpg", "section.image1": "/path/to/image2.jpg" } }
      // Images are at root level for easy access
      const images = texts.images || texts.he?.images || {}
      
      const imagePath = images[imageKey] || null
      
      if (imagePath) {
        // Normalize path: extract path from full URL if needed
        const normalizedPath = normalizeImagePath(imagePath)
        saveToCache(cacheKey, normalizedPath)
        return normalizedPath
      } else {
        // Images should be in GitHub JSON - if not found, return null (no fallback)
        saveToCache(cacheKey, null)
        return null
      }
    } catch (error) {
      return null
    }
  }
  
  // In edit mode only, load from Firebase
  try {
    if (!db) {
      const cached = getFromCache(cacheKey, false)
      return cached || null
    }
    
    const imageDoc = await getDoc(doc(db, 'images', imageKey))
    
    let imagePath = null
    if (imageDoc.exists()) {
      const data = imageDoc.data()
      imagePath = data.path || null
      // Normalize path: extract path from full URL if needed (for backward compatibility)
      if (imagePath) {
        imagePath = normalizeImagePath(imagePath)
      }
    }
    
    // Save to cache (even null values to avoid repeated queries)
    saveToCache(cacheKey, imagePath)
    
    return imagePath
  } catch (error) {
    const cached = getFromCache(cacheKey, false)
    return cached || null
  }
}

// ============================================
// PARLIAMENT OPERATIONS
// ============================================

/**
 * Load all parliament dates
 * Checks cache first before going to Firebase
 * @param {boolean} forceRefresh - If true, bypass cache and fetch from Firebase
 * @param {number} cacheDuration - Custom cache duration in milliseconds (defaults to CACHE_DURATION)
 * @returns {Promise<Array>} Array of date objects with id
 */
export const loadParliamentDates = async (forceRefresh = false, cacheDuration = CACHE_DURATION) => {
  const cacheKey = CACHE_KEYS.PARLIAMENT_DATES
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey, true, cacheDuration)
    if (cached !== null) {
      return cached
    }
  }
  
  try {
    if (!db) {
      const cached = getFromCache(cacheKey, false, cacheDuration)
      return cached || []
    }
    
    const snap = await getDocs(query(collection(db, 'parliamentDates'), orderBy('date', 'asc')))
    const dates = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Save to cache
    saveToCache(cacheKey, dates)
    
    return dates
  } catch (error) {
    const cached = getFromCache(cacheKey, false, cacheDuration)
    return cached || []
  }
}

/**
 * Create a new parliament date
 * Clears cache after creation
 * @param {object} dateData - {title, date, isOpen, createdByUid, createdByName}
 * @returns {Promise<{success: boolean, id?: string}>}
 */
export const createParliamentDate = async (dateData) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    const docRef = await addDoc(collection(db, 'parliamentDates'), {
      title: dateData.title,
      date: dateData.date,
      isOpen: dateData.isOpen !== undefined ? dateData.isOpen : true,
      createdAt: serverTimestamp(),
      createdByUid: dateData.createdByUid || '',
      createdByName: dateData.createdByName || 'Admin',
    })
    
    // Clear cache so next load gets fresh data
    clearCache(CACHE_KEYS.PARLIAMENT_DATES)
    
    return { success: true, id: docRef.id }
  } catch (error) {
    throw error
  }
}

/**
 * Update a parliament date (title and/or date)
 * Clears cache after update
 * @param {string} dateId - Document ID
 * @param {object} updateData - {title?: string, date?: Date}
 * @returns {Promise<{success: boolean}>}
 */
export const updateParliamentDate = async (dateId, updateData) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    const updateFields = {}
    if (updateData.title !== undefined) {
      updateFields.title = updateData.title
    }
    if (updateData.date !== undefined) {
      updateFields.date = updateData.date
    }
    
    if (Object.keys(updateFields).length === 0) {
      throw new Error('לא הוזנו שדות לעדכון')
    }
    
    await updateDoc(doc(db, 'parliamentDates', dateId), updateFields)
    
    // Clear cache so next load gets fresh data
    clearCache(CACHE_KEYS.PARLIAMENT_DATES)
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Toggle parliament date open/closed status
 * Clears cache after update
 * @param {string} dateId - Document ID
 * @param {boolean} isOpen - New status
 * @returns {Promise<{success: boolean}>}
 */
export const toggleParliamentDate = async (dateId, isOpen) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    await updateDoc(doc(db, 'parliamentDates', dateId), { isOpen })
    
    // Clear cache so next load gets fresh data
    clearCache(CACHE_KEYS.PARLIAMENT_DATES)
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Archive a parliament date to history with all related subjects and notes
 * Moves the date, all subjects linked to it, and all notes linked to those subjects to history
 * @param {string} dateId - Document ID
 * @returns {Promise<{success: boolean, archivedCount: {dates: number, subjects: number, notes: number}}>}
 */
export const archiveParliamentDate = async (dateId) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    // Get the date document
    const dateDocRef = doc(db, 'parliamentDates', dateId)
    const dateDoc = await getDoc(dateDocRef)
    
    if (!dateDoc.exists()) {
      throw new Error('תאריך הפרלמנט לא נמצא')
    }
    
    const dateData = dateDoc.data()
    
    // Get all subjects linked to this date
    const subjectsQuery = query(
      collection(db, 'parliamentSubjects'),
      where('dateId', '==', dateId)
    )
    const subjectsSnapshot = await getDocs(subjectsQuery)
    const subjects = subjectsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Get all notes for these subjects
    let allNotes = []
    for (const subject of subjects) {
      const notesQuery = query(
        collection(db, 'parliamentNotes'),
        where('subjectId', '==', subject.id)
      )
      const notesSnapshot = await getDocs(notesQuery)
      const notes = notesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      allNotes.push(...notes)
    }
    
    // Firestore batch limit is 500 operations
    // Each item needs: 1 set (archive) + 1 delete (original) = 2 operations
    // Total operations: 2 (date) + 2*subjects.length + 2*allNotes.length
    const MAX_BATCH_SIZE = 500
    const operationsPerItem = 2
    const itemsPerBatch = Math.floor((MAX_BATCH_SIZE - 2) / operationsPerItem) // Reserve 2 for date operations
    
    const allItems = [
      { type: 'date', data: dateData, id: dateId, ref: dateDocRef },
      ...subjects.map(s => ({ type: 'subject', data: s, id: s.id, ref: doc(db, 'parliamentSubjects', s.id) })),
      ...allNotes.map(n => ({ type: 'note', data: n, id: n.id, ref: doc(db, 'parliamentNotes', n.id) }))
    ]
    
    // Process in batches
    const archivedSubjects = []
    for (let i = 0; i < allItems.length; i += itemsPerBatch) {
      const batch = writeBatch(db)
      const batchItems = allItems.slice(i, i + itemsPerBatch)
      
      for (const item of batchItems) {
        // Archive to history
        const historyRef = doc(collection(db, 'parliamentHistory'))
        const archiveData = {
          ...item.data,
          originalId: item.id,
          archivedAt: serverTimestamp(),
          type: item.type
        }
        
        // Keep dateId reference for subjects and notes
        if (item.type === 'subject') {
          archiveData.dateId = dateId
          archiveData.parliamentId = dateId // Also store as parliamentId for easier querying
        }
        if (item.type === 'note') {
          // Keep subjectId reference for notes
          archiveData.subjectId = item.data.subjectId
        }
        // For date type, store originalId as parliamentId and initialize decisions and summary
        if (item.type === 'date') {
          archiveData.parliamentId = dateId
          archiveData.decisions = [] // Initialize decisions array
          archiveData.summary = '' // Initialize summary
        }
        // For subject type, initialize decisions array
        if (item.type === 'subject') {
          archiveData.decisions = [] // Initialize decisions array for each subject
        }
        
        batch.set(historyRef, archiveData)
        
        // Delete original
        batch.delete(item.ref)
        
        // Track archived subjects for cache clearing
        if (item.type === 'subject') {
          archivedSubjects.push(item.id)
        }
      }
      
      await batch.commit()
    }
    
    // Clear all related caches
    clearCache(CACHE_KEYS.PARLIAMENT_DATES)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_all`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_pending`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_approved`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_rejected`)
    // Clear notes cache for all archived subjects
    archivedSubjects.forEach(subjectId => {
      clearCache(`${CACHE_KEYS.PARLIAMENT_NOTES}${subjectId}`)
    })
    // Clear history cache so it reloads on next access
    clearCache('firebase_cache_parliament_history')
    
    return { 
      success: true, 
      archivedCount: {
        dates: 1,
        subjects: subjects.length,
        notes: allNotes.length
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Load archived parliament history
 * @param {boolean} forceRefresh - If true, bypass cache and fetch from Firebase
 * @returns {Promise<Array>} Array of archived parliament items
 */
/**
 * Add a decision to an archived subject
 * @param {string} subjectOriginalId - The original subject ID
 * @param {string} decisionText - The decision text
 * @param {string} createdByUid - User UID who created the decision
 * @param {string} createdByName - User name who created the decision
 * @returns {Promise<{success: boolean}>}
 */
export const addSubjectDecision = async (subjectOriginalId, decisionText, createdByUid = '', createdByName = 'Admin') => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    // Find the archived subject document
    const historyQuery = query(
      collection(db, 'parliamentHistory'),
      where('type', '==', 'subject'),
      where('originalId', '==', subjectOriginalId)
    )
    const historySnapshot = await getDocs(historyQuery)
    
    if (historySnapshot.empty) {
      throw new Error('נושא לא נמצא בהיסטוריה')
    }
    
    const subjectDoc = historySnapshot.docs[0]
    const currentDecisions = subjectDoc.data().decisions || []
    
    await updateDoc(subjectDoc.ref, {
      decisions: [...currentDecisions, {
        text: decisionText.trim(),
        createdAt: serverTimestamp(),
        createdByUid: createdByUid,
        createdByName: createdByName
      }]
    })
    
    // Clear cache
    clearCache('firebase_cache_parliament_history')
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Update parliament summary
 * @param {string} parliamentId - The original dateId of the parliament
 * @param {string} summary - The summary text
 * @returns {Promise<{success: boolean}>}
 */
export const updateParliamentSummary = async (parliamentId, summary) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    // Find the archived parliament date document
    const historyQuery = query(
      collection(db, 'parliamentHistory'),
      where('type', '==', 'date'),
      where('parliamentId', '==', parliamentId)
    )
    const historySnapshot = await getDocs(historyQuery)
    
    if (historySnapshot.empty) {
      throw new Error('פרלמנט לא נמצא בהיסטוריה')
    }
    
    const parliamentDoc = historySnapshot.docs[0]
    
    await updateDoc(parliamentDoc.ref, {
      summary: summary.trim()
    })
    
    // Clear cache
    clearCache('firebase_cache_parliament_history')
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

export const loadParliamentHistory = async (forceRefresh = false) => {
  const cacheKey = 'firebase_cache_parliament_history'
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey)
    if (cached !== null) {
      return cached
    }
  }
  
  try {
    if (!db) {
      const cached = getFromCache(cacheKey, false)
      return cached || []
    }
    
    const snap = await getDocs(query(collection(db, 'parliamentHistory'), orderBy('archivedAt', 'desc')))
    const history = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Save to cache
    saveToCache(cacheKey, history)
    
    return history
  } catch (error) {
    const cached = getFromCache(cacheKey, false)
    return cached || []
  }
}

/**
 * Delete a parliament date
 * Only deletes the specific date - does NOT delete related subjects or notes
 * Use archiveParliamentDate if you want to move everything to history
 * Clears cache after deletion
 * @param {string} dateId - Document ID
 * @returns {Promise<{success: boolean}>}
 */
export const deleteParliamentDate = async (dateId) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    // Check if there are subjects linked to this date
    const subjectsQuery = query(
      collection(db, 'parliamentSubjects'),
      where('dateId', '==', dateId)
    )
    const subjectsSnapshot = await getDocs(subjectsQuery)
    
    if (!subjectsSnapshot.empty) {
      // Warn that there are linked subjects - suggest archiving instead
      throw new Error(`לא ניתן למחוק תאריך זה כי יש ${subjectsSnapshot.size} נושאים המקושרים אליו. השתמש באפשרות "העבר להיסטוריה" כדי לשמור את כל הנתונים.`)
    }
    
    await deleteDoc(doc(db, 'parliamentDates', dateId))
    
    // Clear cache so next load gets fresh data
    clearCache(CACHE_KEYS.PARLIAMENT_DATES)
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Load all parliament subjects (optionally filtered by status)
 * Checks cache first before going to Firebase
 * @param {string|null} status - Filter by status ('pending', 'approved', 'rejected') or null for all
 * @param {boolean} forceRefresh - If true, bypass cache and fetch from Firebase
 * @param {number} cacheDuration - Custom cache duration in milliseconds (defaults to CACHE_DURATION)
 * @returns {Promise<Array>} Array of subject objects with id
 */
export const loadParliamentSubjects = async (status = null, forceRefresh = false, cacheDuration = CACHE_DURATION) => {
  const cacheKey = `${CACHE_KEYS.PARLIAMENT_SUBJECTS}${status ? `_${status}` : '_all'}`
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey, true, cacheDuration)
    if (cached !== null) {
      return cached
    }
  }
  
  try {
    if (!db) {
      const cached = getFromCache(cacheKey, false, cacheDuration)
      return cached || []
    }
    
    let q = query(collection(db, 'parliamentSubjects'))
    if (status) {
      q = query(collection(db, 'parliamentSubjects'), where('status', '==', status))
    }
    
    const snap = await getDocs(q)
    const subjects = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Save to cache
    saveToCache(cacheKey, subjects)
    
    return subjects
  } catch (error) {
    const cached = getFromCache(cacheKey, false, cacheDuration)
    return cached || []
  }
}

/**
 * Subscribe to parliament subjects for a specific user (real-time)
 * @param {string} userUid - User UID
 * @param {function} callback - Callback function that receives subjects array
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserParliamentSubjects = (userUid, callback) => {
  if (!db || !userUid) {
    return () => {}
  }
  
  const q = query(
    collection(db, 'parliamentSubjects'),
    where('createdByUid', '==', userUid)
  )
  
  // Add timeout to detect connection issues
  let timeoutId = setTimeout(() => {
    console.warn('Firestore real-time subscription timeout - connection may be slow or unavailable')
  }, 20000) // 20 second warning
  
  const unsubscribe = onSnapshot(
    q, 
    (snap) => {
      clearTimeout(timeoutId)
      const subjects = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      callback(subjects)
    }, 
    (error) => {
      clearTimeout(timeoutId)
      console.error('Firestore subscription error:', error)
      // If it's a connection error, return empty array but log it
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded' || 
          error.message?.includes('CONNECTION') || error.message?.includes('timeout')) {
        console.warn('Firestore connection unavailable - using cached data or empty array')
      }
      callback([])
    }
  )
  
  return () => {
    clearTimeout(timeoutId)
    unsubscribe()
  }
}

/**
 * Create a new parliament subject
 * Clears cache after creation
 * Validates that the date is still open before creating
 * @param {object} subjectData - {title, description, createdByUid, createdByName, dateId, dateTitle}
 * @returns {Promise<{success: boolean, id?: string}>}
 */
export const createParliamentSubject = async (subjectData) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    // Validate that the date is still open (race condition protection)
    if (subjectData.dateId) {
      try {
        const dateDoc = await getDoc(doc(db, 'parliamentDates', subjectData.dateId))
        if (!dateDoc.exists()) {
          throw new Error('התאריך שנבחר לא קיים')
        }
        const dateData = dateDoc.data()
        if (dateData.isOpen === false || dateData.isOpen === 'false') {
          throw new Error('התאריך שנבחר כבר לא פתוח להצעות')
        }
      } catch (error) {
        // If it's our validation error, throw it
        if (error.message.includes('לא קיים') || error.message.includes('לא פתוח')) {
          throw error
        }
        // Otherwise, log and continue (date might have been deleted, but we'll allow creation)
        // Could not validate date status - silently continue
      }
    }
    
    const docRef = await addDoc(collection(db, 'parliamentSubjects'), {
      title: subjectData.title,
      description: subjectData.description || '',
      createdByUid: subjectData.createdByUid,
      createdByName: subjectData.createdByName,
      createdByFullName: subjectData.createdByName,
      createdAt: serverTimestamp(),
      status: 'pending',
      dateId: subjectData.dateId,
      dateTitle: subjectData.dateTitle || '',
      notesCount: 0,
    })
    
    // Clear all subject caches (pending, approved, rejected, all)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_all`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_pending`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_approved`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_rejected`)
    
    return { success: true, id: docRef.id }
  } catch (error) {
    throw error
  }
}

/**
 * Update a parliament subject (title, description, dateId)
 * Clears cache after update
 * @param {string} subjectId - Document ID
 * @param {object} updateData - {title?: string, description?: string, dateId?: string, dateTitle?: string}
 * @returns {Promise<{success: boolean}>}
 */
export const updateParliamentSubject = async (subjectId, updateData) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    const updateFields = {}
    if (updateData.title !== undefined) {
      updateFields.title = updateData.title
    }
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description
    }
    if (updateData.dateId !== undefined) {
      updateFields.dateId = updateData.dateId
    }
    if (updateData.dateTitle !== undefined) {
      updateFields.dateTitle = updateData.dateTitle
    }
    
    if (Object.keys(updateFields).length === 0) {
      throw new Error('לא הוזנו שדות לעדכון')
    }
    
    await updateDoc(doc(db, 'parliamentSubjects', subjectId), updateFields)
    
    // Clear all subject caches (pending, approved, rejected, all)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_all`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_pending`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_approved`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_rejected`)
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Delete a parliament subject
 * Also deletes all notes linked to this subject
 * Clears cache after deletion
 * @param {string} subjectId - Document ID
 * @returns {Promise<{success: boolean, deletedNotes: number}>}
 */
export const deleteParliamentSubject = async (subjectId) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    // Get all notes for this subject
    const notesQuery = query(
      collection(db, 'parliamentNotes'),
      where('subjectId', '==', subjectId)
    )
    const notesSnapshot = await getDocs(notesQuery)
    const notes = notesSnapshot.docs.map(d => ({ id: d.id }))
    
    // Delete notes and subject in batches if needed
    const MAX_BATCH_SIZE = 500
    const itemsPerBatch = Math.floor(MAX_BATCH_SIZE / 2) // Each item needs 1 delete operation
    
    const allItems = [
      { type: 'subject', id: subjectId, ref: doc(db, 'parliamentSubjects', subjectId) },
      ...notes.map(n => ({ type: 'note', id: n.id, ref: doc(db, 'parliamentNotes', n.id) }))
    ]
    
    // Process in batches
    for (let i = 0; i < allItems.length; i += itemsPerBatch) {
      const batch = writeBatch(db)
      const batchItems = allItems.slice(i, i + itemsPerBatch)
      
      for (const item of batchItems) {
        batch.delete(item.ref)
      }
      
      await batch.commit()
    }
    
    // Clear all subject caches
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_all`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_pending`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_approved`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_rejected`)
    // Clear notes cache for this subject
    clearCache(`${CACHE_KEYS.PARLIAMENT_NOTES}${subjectId}`)
    
    return { success: true, deletedNotes: notes.length }
  } catch (error) {
    throw error
  }
}

/**
 * Update parliament subject status
 * Clears cache after update
 * @param {string} subjectId - Document ID
 * @param {string} status - New status ('pending', 'approved', 'rejected')
 * @param {string} statusReason - Optional reason for status change
 * @returns {Promise<{success: boolean}>}
 */
export const updateParliamentSubjectStatus = async (subjectId, status, statusReason = '') => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    const updateData = { status }
    if (statusReason) {
      updateData.statusReason = statusReason
    } else if (status === 'approved') {
      updateData.statusReason = ''
    }
    
    await updateDoc(doc(db, 'parliamentSubjects', subjectId), updateData)
    
    // Clear all subject caches (pending, approved, rejected, all)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_all`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_pending`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_approved`)
    clearCache(`${CACHE_KEYS.PARLIAMENT_SUBJECTS}_rejected`)
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Load notes for a parliament subject
 * Checks cache first before going to Firebase
 * @param {string} subjectId - Subject document ID
 * @param {boolean} forceRefresh - If true, bypass cache and fetch from Firebase
 * @param {number} cacheDuration - Custom cache duration in milliseconds (defaults to CACHE_DURATION)
 * @returns {Promise<Array>} Array of note objects with id
 */
export const loadParliamentNotes = async (subjectId, forceRefresh = false, cacheDuration = CACHE_DURATION) => {
  if (!subjectId) return []
  
  const cacheKey = `${CACHE_KEYS.PARLIAMENT_NOTES}${subjectId}`
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey, true, cacheDuration)
    if (cached !== null) {
      return cached
    }
  }
  
  try {
    if (!db) {
      const cached = getFromCache(cacheKey, false, cacheDuration)
      return cached || []
    }
    
    const q = query(
      collection(db, 'parliamentNotes'),
      where('subjectId', '==', subjectId)
    )
    const snap = await getDocs(q)
    const notes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Save to cache
    saveToCache(cacheKey, notes)
    
    return notes
  } catch (error) {
    const cached = getFromCache(cacheKey, false, cacheDuration)
    return cached || []
  }
}

/**
 * Create a new parliament note (or reply)
 * Clears cache after creation
 * @param {object} noteData - {subjectId, text, createdByUid, createdByName, parentNoteId}
 * @returns {Promise<{success: boolean, id?: string}>}
 */
export const createParliamentNote = async (noteData) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    const docRef = await addDoc(collection(db, 'parliamentNotes'), {
      subjectId: noteData.subjectId,
      text: noteData.text,
      createdByUid: noteData.createdByUid,
      createdByName: noteData.createdByName,
      createdAt: serverTimestamp(),
      parentNoteId: noteData.parentNoteId || null,
    })
    
    // Clear cache for this subject's notes
    if (noteData.subjectId) {
      clearCache(`${CACHE_KEYS.PARLIAMENT_NOTES}${noteData.subjectId}`)
    }
    
    return { success: true, id: docRef.id }
  } catch (error) {
    throw error
  }
}

/**
 * Update a parliament note
 * Clears cache after update
 * @param {string} noteId - Document ID
 * @param {string} text - New text
 * @param {string} subjectId - Subject ID (optional, for cache clearing)
 * @returns {Promise<{success: boolean}>}
 */
export const updateParliamentNote = async (noteId, text, subjectId = null) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    await updateDoc(doc(db, 'parliamentNotes', noteId), {
      text,
      updatedAt: serverTimestamp(),
    })
    
    // Clear cache if subjectId provided
    if (subjectId) {
      clearCache(`${CACHE_KEYS.PARLIAMENT_NOTES}${subjectId}`)
    }
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Delete a parliament note
 * Clears cache after deletion
 * @param {string} noteId - Document ID
 * @param {string} subjectId - Subject ID (optional, for cache clearing)
 * @returns {Promise<{success: boolean}>}
 */
export const deleteParliamentNote = async (noteId, subjectId = null) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    await deleteDoc(doc(db, 'parliamentNotes', noteId))
    
    // Clear cache if subjectId provided
    if (subjectId) {
      clearCache(`${CACHE_KEYS.PARLIAMENT_NOTES}${subjectId}`)
    }
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Load all users
 * Checks cache first before going to Firebase
 * @param {boolean} forceRefresh - If true, bypass cache and fetch from Firebase
 * @returns {Promise<Array>} Array of user objects with id
 */
export const loadUsers = async (forceRefresh = false) => {
  const cacheKey = CACHE_KEYS.USERS
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey)
    if (cached !== null) {
      return cached
    }
  }
  
  try {
    if (!db) {
      const cached = getFromCache(cacheKey, false)
      return cached || []
    }
    
    const snap = await getDocs(query(collection(db, 'appUsers'), orderBy('usernameLower')))
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Save to cache
    saveToCache(cacheKey, users)
    
    return users
  } catch (error) {
    const cached = getFromCache(cacheKey, false)
    return cached || []
  }
}

/**
 * Find user by username (lowercase)
 * @param {string} usernameLower - Username in lowercase
 * @returns {Promise<{id: string, data: object}|null>}
 * @throws {Error} If connection error occurs (timeout, network error, etc.)
 */
export const findUserByUsername = async (usernameLower) => {
  try {
    if (!db || !usernameLower) return null
    
    const q = query(
      collection(db, 'appUsers'),
      where('usernameLower', '==', usernameLower),
      limit(1)
    )
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Connection timeout - Firestore is not responding. Please check your internet connection and try again.'))
      }, 15000) // 15 second timeout
    })
    
    const queryPromise = getDocs(q)
    const snap = await Promise.race([queryPromise, timeoutPromise])
    
    if (snap.empty) return null
    
    const doc = snap.docs[0]
    return { id: doc.id, data: doc.data() }
  } catch (error) {
    // Re-throw connection/timeout errors so they can be handled appropriately
    if (error.message && (
      error.message.includes('timeout') || 
      error.message.includes('network') ||
      error.message.includes('CONNECTION') ||
      error.code === 'unavailable' ||
      error.code === 'deadline-exceeded'
    )) {
      throw error
    }
    // For other errors (permission denied, etc.), return null
    console.error('Error finding user:', error)
    return null
  }
}

/**
 * Check if username exists
 * @param {string} usernameLower - Username in lowercase
 * @param {string} excludeId - Optional document ID to exclude from check
 * @returns {Promise<boolean>}
 * @throws {Error} If connection error occurs (timeout, network error, etc.)
 */
export const checkUsernameExists = async (usernameLower, excludeId = null) => {
  try {
    if (!db || !usernameLower) return false
    
    const q = query(
      collection(db, 'appUsers'),
      where('usernameLower', '==', usernameLower)
    )
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Connection timeout - Firestore is not responding. Please check your internet connection and try again.'))
      }, 15000) // 15 second timeout
    })
    
    const queryPromise = getDocs(q)
    const snap = await Promise.race([queryPromise, timeoutPromise])
    
    if (snap.empty) return false
    
    // If excludeId is provided, check if any doc other than excludeId exists
    if (excludeId) {
      return snap.docs.some(d => d.id !== excludeId)
    }
    
    return true
  } catch (error) {
    // Re-throw connection/timeout errors so they can be handled appropriately
    if (error.message && (
      error.message.includes('timeout') || 
      error.message.includes('network') ||
      error.message.includes('CONNECTION') ||
      error.code === 'unavailable' ||
      error.code === 'deadline-exceeded'
    )) {
      throw error
    }
    // For other errors, return false
    console.error('Error checking username:', error)
    return false
  }
}

/**
 * Create a new user
 * Clears cache after creation
 * @param {object} userData - {username, usernameLower, firstName, lastName, role, birthday, classId, passwordHash}
 * @returns {Promise<{success: boolean, id?: string}>}
 */
export const createUser = async (userData) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    const docRef = await addDoc(collection(db, 'appUsers'), {
      username: userData.username,
      usernameLower: userData.usernameLower,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      role: userData.role || 'student',
      birthday: userData.birthday || '',
      classId: userData.classId || '',
      passwordHash: userData.passwordHash,
      createdAt: serverTimestamp(),
    })
    
    // Clear cache so next load gets fresh data
    clearCache(CACHE_KEYS.USERS)
    
    return { success: true, id: docRef.id }
  } catch (error) {
    throw error
  }
}

/**
 * Update a user
 * Clears cache after update
 * @param {string} userId - Document ID
 * @param {object} updateData - Fields to update
 * @returns {Promise<{success: boolean}>}
 */
export const updateUser = async (userId, updateData) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    await updateDoc(doc(db, 'appUsers', userId), updateData)
    
    // Clear cache so next load gets fresh data
    clearCache(CACHE_KEYS.USERS)
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

/**
 * Delete a user
 * Clears cache after deletion
 * @param {string} userId - Document ID
 * @returns {Promise<{success: boolean}>}
 */
export const deleteUser = async (userId) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    await deleteDoc(doc(db, 'appUsers', userId))
    
    // Clear cache so next load gets fresh data
    clearCache(CACHE_KEYS.USERS)
    
    return { success: true }
  } catch (error) {
    throw error
  }
}

// ============================================
// ROLE OPERATIONS
// ============================================

/**
 * Get user role from a collection by document ID
 * @param {string} collectionName - Collection name ('appUsers' or 'users')
 * @param {string} docId - Document ID
 * @returns {Promise<string>} Role string or empty string
 */
export const getRoleByDocId = async (collectionName, docId) => {
  try {
    if (!db || !docId) return ''
    
    const docSnap = await getDoc(doc(db, collectionName, docId))
    if (!docSnap.exists()) return ''
    
    const data = docSnap.data()
    const role = (data?.role || '').trim().toLowerCase()
    const validRoles = ['admin', 'editor', 'committee', 'parent', 'student']
    if (validRoles.includes(role)) return role
    
    // Fallback for 'users' collection
    if (collectionName === 'users' && data?.isAdmin) return 'admin'
    
    return ''
  } catch (error) {
    return ''
  }
}

/**
 * Get user role from a collection by field value
 * @param {string} collectionName - Collection name ('appUsers' or 'users')
 * @param {string} fieldName - Field name ('uid', 'email', 'usernameLower')
 * @param {string} fieldValue - Field value to search for
 * @returns {Promise<string>} Role string or empty string
 */
export const getRoleByField = async (collectionName, fieldName, fieldValue) => {
  try {
    if (!db || !fieldValue) return ''
    
    const q = query(
      collection(db, collectionName),
      where(fieldName, '==', fieldValue),
      limit(1)
    )
    const snap = await getDocs(q)
    
    if (snap.empty) return ''
    
    const data = snap.docs[0].data()
    const role = (data?.role || '').trim().toLowerCase()
    const validRoles = ['admin', 'editor', 'committee', 'parent', 'student']
    if (validRoles.includes(role)) return role
    
    // Fallback for 'users' collection
    if (collectionName === 'users' && data?.isAdmin) return 'admin'
    
    return ''
  } catch (error) {
    return ''
  }
}

/**
 * Resolve user role from database
 * Checks appUsers first, then users collection
 * @param {object} ident - {uid, email, usernameLower}
 * @returns {Promise<string>} Role string or empty string
 */
export const resolveUserRole = async (ident) => {
  if (!ident) return ''
  
  // Try appUsers collection first
  if (ident.uid) {
    const role = await getRoleByDocId('appUsers', ident.uid)
    if (role) return role
  }
  
  if (ident.uid) {
    const role = await getRoleByField('appUsers', 'uid', ident.uid)
    if (role) return role
  }
  
  if (ident.email) {
    const role = await getRoleByField('appUsers', 'email', ident.email)
    if (role) return role
  }
  
  if (ident.usernameLower) {
    const role = await getRoleByField('appUsers', 'usernameLower', ident.usernameLower)
    if (role) return role
  }
  
  // Fallback to 'users' collection
  if (ident.uid) {
    const role = await getRoleByDocId('users', ident.uid)
    if (role) return role
  }
  
  if (ident.uid) {
    const role = await getRoleByField('users', 'uid', ident.uid)
    if (role) return role
  }
  
  if (ident.email) {
    const role = await getRoleByField('users', 'email', ident.email)
    if (role) return role
  }
  
  if (ident.usernameLower) {
    const role = await getRoleByField('users', 'usernameLower', ident.usernameLower)
    if (role) return role
  }
  
  return ''
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Translations
  loadTranslationsFromDB,
  saveTranslationToDB,
  saveAllTranslationsToDB,
  // Contact
  submitContactFormToDB,
  // Images
  saveImagePathToDB,
  loadImagePathFromDB,
  // Parliament
  loadParliamentDates,
  createParliamentDate,
  toggleParliamentDate,
  deleteParliamentDate,
  loadParliamentSubjects,
  subscribeToUserParliamentSubjects,
  createParliamentSubject,
  updateParliamentSubjectStatus,
  loadParliamentNotes,
  createParliamentNote,
  updateParliamentNote,
  deleteParliamentNote,
  // Users
  loadUsers,
  findUserByUsername,
  checkUsernameExists,
  createUser,
  updateUser,
  deleteUser,
  // Roles
  getRoleByDocId,
  getRoleByField,
  resolveUserRole,
  // Cache
  clearAllCache,
}
