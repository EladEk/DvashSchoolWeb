// Centralized Firebase Database Operations
// ALL Firestore read/write operations should go through this file
// Cache-first strategy: Check localStorage/cache before making Firebase calls

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
 * @returns {any|null} Cached data or null
 */
const getFromCache = (cacheKey, checkMemory = true) => {
  // Check memory cache first (fastest)
  if (checkMemory) {
    const cached = memoryCache.get(cacheKey)
    const cacheTime = memoryCacheTime.get(cacheKey)
    if (cached !== undefined && cacheTime) {
      const age = Date.now() - cacheTime
      if (age < CACHE_DURATION) {
        return cached
      } else {
        // Expired, remove from memory
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
        if (age < CACHE_DURATION) {
          // Update memory cache
          memoryCache.set(cacheKey, parsed.data)
          memoryCacheTime.set(cacheKey, parsed.timestamp)
          return parsed.data
        } else {
          // Expired, remove from localStorage
          localStorage.removeItem(cacheKey)
        }
      }
    }
  } catch (error) {
    console.error(`Error reading cache for ${cacheKey}:`, error)
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
  
  // Save to memory cache
  memoryCache.set(cacheKey, data)
  memoryCacheTime.set(cacheKey, timestamp)
  
  // Save to localStorage
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp
    }))
  } catch (error) {
    console.error(`Error saving cache for ${cacheKey}:`, error)
    // If localStorage is full, clear old cache entries
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
    console.error(`Error clearing cache for ${cacheKey}:`, error)
  }
}

/**
 * Clear old cache entries (older than CACHE_DURATION)
 */
const clearOldCache = () => {
  const now = Date.now()
  const keysToRemove = []
  
  // Check localStorage
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
          // Invalid cache entry, remove it
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
    console.error('Error clearing old cache:', error)
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
    console.error('Error clearing all cache:', error)
  }
}

// ============================================
// TRANSLATIONS OPERATIONS
// ============================================

/**
 * Load translations from Firebase
 * Uses a single query to fetch both documents, reducing DB calls
 * @returns {Promise<{he: object, en: object} | null>}
 */
export const loadTranslationsFromDB = async () => {
  try {
    if (!db) {
      return null
    }
    
    // Batch fetch both translation documents in a single query
    // This reduces from 2 separate getDoc calls to 1 query
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
 * Save a single translation to Firebase using batch write (SINGLE network call)
 * Only updates the specific field that was changed
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
    
    // Build nested update objects - ONLY the changed field
    // Example: translationKey='about.title' creates { about: { title: value } }
    const heUpdate = buildNestedUpdate(translationKey, hebrewValue)
    const enUpdate = buildNestedUpdate(translationKey, englishValue)
    
    // Use batch write - SINGLE Firebase network call for both documents
    // This ensures atomicity and efficiency
    // Use setDoc with merge instead of update to handle documents that don't exist yet
    const batch = writeBatch(db)
    const heDocRef = doc(db, 'translations', 'he')
    const enDocRef = doc(db, 'translations', 'en')
    
    // Use setDoc with merge: true to create or update
    // This works even if the documents don't exist yet
    batch.set(heDocRef, heUpdate, { merge: true })
    batch.set(enDocRef, enUpdate, { merge: true })
    
    // Commit the batch with timeout to prevent hanging
    const commitPromise = batch.commit()
    const timeoutPromise = new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Firebase save timeout - client may be offline'))
      }, 10000)
      // Clear timeout if commit succeeds
      commitPromise.finally(() => clearTimeout(timeoutId))
    })
    
    // Race between commit and timeout
    await Promise.race([commitPromise, timeoutPromise])
    
    return { success: true }
  } catch (error) {
    console.error('❌ Error saving translation to Firebase:', error)
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
    console.error('Error saving all translations to Firebase:', error)
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
    console.error('Error submitting contact form:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// IMAGE OPERATIONS
// ============================================

/**
 * Save image path to Firebase
 * Updates cache after save
 * @param {string} imageKey - Image key (e.g., 'hero.image', 'about.image1')
 * @param {string|null} imagePath - ImageKit path or null to delete
 * @returns {Promise<{success: boolean}>}
 */
export const saveImagePathToDB = async (imageKey, imagePath) => {
  try {
    if (!db) {
      throw new Error('Firebase not configured')
    }
    
    const imageDocRef = doc(db, 'images', imageKey)
    
    if (imagePath === null) {
      // Delete the image
      await updateDoc(imageDocRef, {
        path: null,
        updatedAt: serverTimestamp(),
      })
    } else {
      // Save or update the image path
      await setDoc(imageDocRef, {
        path: imagePath,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    }
    
    // Update cache immediately
    const cacheKey = `${CACHE_KEYS.IMAGES}${imageKey}`
    saveToCache(cacheKey, imagePath)
    
    return { success: true }
  } catch (error) {
    console.error('Error saving image path to Firebase:', error)
    throw error
  }
}

/**
 * Load image path from Firebase
 * Checks cache first before going to Firebase
 * @param {string} imageKey - Image key
 * @param {boolean} forceRefresh - If true, bypass cache and fetch from Firebase
 * @returns {Promise<string|null>}
 */
export const loadImagePathFromDB = async (imageKey, forceRefresh = false) => {
  if (!imageKey) return null
  
  const cacheKey = `${CACHE_KEYS.IMAGES}${imageKey}`
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey)
    if (cached !== null) {
      return cached
    }
  }
  
  try {
    if (!db) {
      // If no DB, return cached data if available
      const cached = getFromCache(cacheKey, false)
      return cached || null
    }
    
    const imageDoc = await getDoc(doc(db, 'images', imageKey))
    
    let imagePath = null
    if (imageDoc.exists()) {
      const data = imageDoc.data()
      imagePath = data.path || null
    }
    
    // Save to cache (even null values to avoid repeated queries)
    saveToCache(cacheKey, imagePath)
    
    return imagePath
  } catch (error) {
    // Return cached data if available, even if expired
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
 * @returns {Promise<Array>} Array of date objects with id
 */
export const loadParliamentDates = async (forceRefresh = false) => {
  const cacheKey = CACHE_KEYS.PARLIAMENT_DATES
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey)
    if (cached !== null) {
      return cached
    }
  }
  
  try {
    if (!db) {
      // If no DB, return cached data if available
      const cached = getFromCache(cacheKey, false)
      return cached || []
    }
    
    const snap = await getDocs(query(collection(db, 'parliamentDates'), orderBy('date', 'asc')))
    const dates = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Save to cache
    saveToCache(cacheKey, dates)
    
    return dates
  } catch (error) {
    console.error('Error loading parliament dates:', error)
    // Return cached data if available, even if expired
    const cached = getFromCache(cacheKey, false)
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
    console.error('Error creating parliament date:', error)
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
    console.error('Error toggling parliament date:', error)
    throw error
  }
}

/**
 * Delete a parliament date
 * Clears cache after deletion
 * @param {string} dateId - Document ID
 * @returns {Promise<{success: boolean}>}
 */
export const deleteParliamentDate = async (dateId) => {
  try {
    if (!db) throw new Error('Firebase not configured')
    
    await deleteDoc(doc(db, 'parliamentDates', dateId))
    
    // Clear cache so next load gets fresh data
    clearCache(CACHE_KEYS.PARLIAMENT_DATES)
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting parliament date:', error)
    throw error
  }
}

/**
 * Load all parliament subjects (optionally filtered by status)
 * Checks cache first before going to Firebase
 * @param {string|null} status - Filter by status ('pending', 'approved', 'rejected') or null for all
 * @param {boolean} forceRefresh - If true, bypass cache and fetch from Firebase
 * @returns {Promise<Array>} Array of subject objects with id
 */
export const loadParliamentSubjects = async (status = null, forceRefresh = false) => {
  const cacheKey = `${CACHE_KEYS.PARLIAMENT_SUBJECTS}${status ? `_${status}` : '_all'}`
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey)
    if (cached !== null) {
      return cached
    }
  }
  
  try {
    if (!db) {
      // If no DB, return cached data if available
      const cached = getFromCache(cacheKey, false)
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
    console.error('Error loading parliament subjects:', error)
    // Return cached data if available, even if expired
    const cached = getFromCache(cacheKey, false)
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
  
  return onSnapshot(q, (snap) => {
    const subjects = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(subjects)
  }, (error) => {
    console.error('Error in parliament subjects subscription:', error)
    callback([])
  })
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
    console.error('Error creating parliament subject:', error)
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
    console.error('Error updating parliament subject status:', error)
    throw error
  }
}

/**
 * Load notes for a parliament subject
 * Checks cache first before going to Firebase
 * @param {string} subjectId - Subject document ID
 * @param {boolean} forceRefresh - If true, bypass cache and fetch from Firebase
 * @returns {Promise<Array>} Array of note objects with id
 */
export const loadParliamentNotes = async (subjectId, forceRefresh = false) => {
  if (!subjectId) return []
  
  const cacheKey = `${CACHE_KEYS.PARLIAMENT_NOTES}${subjectId}`
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey)
    if (cached !== null) {
      return cached
    }
  }
  
  try {
    if (!db) {
      // If no DB, return cached data if available
      const cached = getFromCache(cacheKey, false)
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
    console.error('Error loading parliament notes:', error)
    // Return cached data if available, even if expired
    const cached = getFromCache(cacheKey, false)
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
    console.error('Error creating parliament note:', error)
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
    console.error('Error updating parliament note:', error)
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
    console.error('Error deleting parliament note:', error)
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
      // If no DB, return cached data if available
      const cached = getFromCache(cacheKey, false)
      return cached || []
    }
    
    const snap = await getDocs(query(collection(db, 'appUsers'), orderBy('usernameLower')))
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Save to cache
    saveToCache(cacheKey, users)
    
    return users
  } catch (error) {
    console.error('Error loading users:', error)
    // Return cached data if available, even if expired
    const cached = getFromCache(cacheKey, false)
    return cached || []
  }
}

/**
 * Find user by username (lowercase)
 * @param {string} usernameLower - Username in lowercase
 * @returns {Promise<{id: string, data: object}|null>}
 */
export const findUserByUsername = async (usernameLower) => {
  try {
    if (!db || !usernameLower) return null
    
    const q = query(
      collection(db, 'appUsers'),
      where('usernameLower', '==', usernameLower),
      limit(1)
    )
    const snap = await getDocs(q)
    
    if (snap.empty) return null
    
    const doc = snap.docs[0]
    return { id: doc.id, data: doc.data() }
  } catch (error) {
    console.error('Error finding user by username:', error)
    return null
  }
}

/**
 * Check if username exists
 * @param {string} usernameLower - Username in lowercase
 * @param {string} excludeId - Optional document ID to exclude from check
 * @returns {Promise<boolean>}
 */
export const checkUsernameExists = async (usernameLower, excludeId = null) => {
  try {
    if (!db || !usernameLower) return false
    
    const q = query(
      collection(db, 'appUsers'),
      where('usernameLower', '==', usernameLower)
    )
    const snap = await getDocs(q)
    
    if (snap.empty) return false
    
    // If excludeId is provided, check if any doc other than excludeId exists
    if (excludeId) {
      return snap.docs.some(d => d.id !== excludeId)
    }
    
    return true
  } catch (error) {
    console.error('Error checking username exists:', error)
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
    console.error('Error creating user:', error)
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
    console.error('Error updating user:', error)
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
    console.error('Error deleting user:', error)
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
    console.error('Error getting role by doc ID:', error)
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
    console.error('Error getting role by field:', error)
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
