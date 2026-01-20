// Centralized Firebase Database Operations
// ALL Firestore read/write operations should go through this file

import { db } from './firebase'
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  writeBatch,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'

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
    console.log('Firebase translations not available:', error.message)
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
    
    console.log(`✅ Saved translation "${translationKey}" to Firebase (single batch call)`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error saving translation to Firebase:', error)
    throw error
  }
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
    
    // Use merge to update without overwriting
    await Promise.all([
      setDoc(doc(db, 'translations', 'he'), translations.he, { merge: true }),
      setDoc(doc(db, 'translations', 'en'), translations.en, { merge: true })
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
// EXPORTS
// ============================================

export default {
  // Translations
  loadTranslationsFromDB,
  saveTranslationToDB,
  saveAllTranslationsToDB,
  // Contact
  submitContactFormToDB,
}
