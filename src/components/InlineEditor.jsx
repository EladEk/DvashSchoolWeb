import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { getTranslations, saveTranslations, getDefaultTranslations, clearTranslationsCache } from '../services/adminService'
import './InlineEditor.css'

const InlineEditor = ({ translationKey, onClose, onSave }) => {
  const { t, reloadTranslations } = useTranslation()
  const [hebrewValue, setHebrewValue] = useState('')
  const [englishValue, setEnglishValue] = useState('')
  const [defaultHebrew, setDefaultHebrew] = useState('')
  const [defaultEnglish, setDefaultEnglish] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const modalRef = useRef(null)

  useEffect(() => {
    loadValues()
  }, [translationKey])

  const loadValues = async () => {
    try {
      setLoading(true)
      // Load current translations (skip Firebase for speed)
      const current = await getTranslations(true)
      
      // Load default translations (cached)
      const defaults = await getDefaultTranslations()
      const heDefault = defaults.he
      const enDefault = defaults.en

      // Get values using the translation key
      const keys = translationKey.split('.')
      
      let currentHe = current.he
      let currentEn = current.en
      let defaultHe = heDefault
      let defaultEn = enDefault

      for (const key of keys) {
        currentHe = currentHe?.[key]
        currentEn = currentEn?.[key]
        defaultHe = defaultHe?.[key]
        defaultEn = defaultEn?.[key]
      }

      // Handle arrays (like FAQ questions)
      if (Array.isArray(currentHe)) {
        const arrayIndex = parseInt(keys[keys.length - 1])
        const itemKey = keys[keys.length - 2]
        if (!isNaN(arrayIndex)) {
          const parentKey = keys.slice(0, -2).join('.')
          let parentHe = current.he
          let parentEn = current.en
          let parentDefaultHe = heDefault
          let parentDefaultEn = enDefault

          for (const k of parentKey.split('.')) {
            parentHe = parentHe?.[k]
            parentEn = parentEn?.[k]
            parentDefaultHe = parentDefaultHe?.[k]
            parentDefaultEn = parentDefaultEn?.[k]
          }

          setHebrewValue(parentHe?.[arrayIndex]?.[itemKey] || '')
          setEnglishValue(parentEn?.[arrayIndex]?.[itemKey] || '')
          setDefaultHebrew(parentDefaultHe?.[arrayIndex]?.[itemKey] || '')
          setDefaultEnglish(parentDefaultEn?.[arrayIndex]?.[itemKey] || '')
        } else {
          setHebrewValue(currentHe || '')
          setEnglishValue(currentEn || '')
          setDefaultHebrew(defaultHe || '')
          setDefaultEnglish(defaultEn || '')
        }
      } else {
        setHebrewValue(currentHe || '')
        setEnglishValue(currentEn || '')
        setDefaultHebrew(defaultHe || '')
        setDefaultEnglish(defaultEn || '')
      }
    } catch (error) {
      console.error('Error loading values:', error)
    } finally {
      setLoading(false)
    }
  }

  const setNestedValue = (obj, keys, value) => {
    const keysArray = keys.split('.')
    let current = obj
    
    // Handle array indices (like faq.questions.0.question)
    for (let i = 0; i < keysArray.length - 1; i++) {
      const key = keysArray[i]
      const nextKey = keysArray[i + 1]
      const isArrayIndex = !isNaN(parseInt(nextKey))
      
      if (isArrayIndex) {
        // We're dealing with an array
        const arrayIndex = parseInt(nextKey)
        if (!current[key]) {
          current[key] = []
        }
        if (!Array.isArray(current[key])) {
          current[key] = []
        }
        // Ensure array is large enough
        while (current[key].length <= arrayIndex) {
          current[key].push({})
        }
        current = current[key][arrayIndex]
        i++ // Skip the array index key
      } else {
        // Regular object property
        if (!current[key]) {
          current[key] = {}
        }
        current = current[key]
      }
    }
    
    // Set the final value
    const finalKey = keysArray[keysArray.length - 1]
    current[finalKey] = value
  }

  // Auto-save to localStorage when closing
  const saveChanges = useCallback(async () => {
    try {
      // Load translations quickly (skip Firebase)
      const current = await getTranslations(true)
      
      // Update both Hebrew and English translations
      setNestedValue(current.he, translationKey, hebrewValue)
      setNestedValue(current.en, translationKey, englishValue)

      // Save to localStorage immediately (fast, synchronous)
      localStorage.setItem('admin_translations', JSON.stringify(current))
      
      // Mark this key as changed for incremental Firebase save
      const { markKeyAsChanged } = await import('../services/adminService')
      markKeyAsChanged(translationKey)
      
      // Update cache
      clearTranslationsCache()
      
      // Reload translations in background (don't wait)
      reloadTranslations().catch(console.error)
      
      onSave()
    } catch (error) {
      console.error('Error saving:', error)
    }
  }, [translationKey, hebrewValue, englishValue, reloadTranslations, onSave])

  const handleClose = useCallback(async () => {
    // Save to localStorage only when closing (no Firebase)
    await saveChanges()
    onClose()
  }, [saveChanges, onClose])

  const handleSaveToFirebase = useCallback(async () => {
    try {
      setSaving(true)
      setSaveMessage('')
      
      // First save to localStorage
      await saveChanges()
      
      // Save this specific translation to Firebase - SINGLE batch call
      const { db } = await import('../services/firebase')
      const { doc, writeBatch } = await import('firebase/firestore')
      
      if (!db) {
        throw new Error('Firebase not configured')
      }
      
      // Build nested update object efficiently (only the edited field path)
      const keys = translationKey.split('.')
      const buildUpdate = (value) => {
        const update = {}
        let current = update
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = {}
          current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = value
        return update
      }
      
      // Use batch write - SINGLE Firebase call for both documents
      const batch = writeBatch(db)
      batch.update(doc(db, 'translations', 'he'), buildUpdate(hebrewValue))
      batch.update(doc(db, 'translations', 'en'), buildUpdate(englishValue))
      await batch.commit() // Single network call - both updates in one request
      
      // Update local state (translations already in localStorage from saveChanges)
      clearTranslationsCache()
      // Refresh UI (uses localStorage, no Firebase call)
      reloadTranslations().catch(console.error)
      
      setSaveMessage('Saved to Firebase!')
      setTimeout(() => {
        setSaveMessage('')
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Error saving to Firebase:', error)
      setSaveMessage('Error saving to Firebase')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }, [translationKey, hebrewValue, englishValue, saveChanges, onClose, reloadTranslations])

  useEffect(() => {
    // Close on escape key (with auto-save)
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleClose])

  useEffect(() => {
    // Close on click outside (with auto-save)
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClose])

  const handleReset = () => {
    if (confirm('Reset to default values?')) {
      setHebrewValue(defaultHebrew)
      setEnglishValue(defaultEnglish)
    }
  }

  if (loading) {
    return (
      <div className="inline-editor-overlay">
        <div className="inline-editor-modal" ref={modalRef}>
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="inline-editor-overlay">
      <div className="inline-editor-modal" ref={modalRef}>
        <div className="editor-header">
          <h3>Edit Translation: {translationKey}</h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        <div className="editor-content">
          <div className="editor-field">
            <label>Hebrew (עברית)</label>
            <textarea
              value={hebrewValue}
              onChange={(e) => setHebrewValue(e.target.value)}
              rows={6}
              dir="rtl"
            />
            {defaultHebrew && (
              <button className="reset-btn" onClick={() => setHebrewValue(defaultHebrew)}>
                Reset to Default
              </button>
            )}
          </div>
          <div className="editor-field">
            <label>English</label>
            <textarea
              value={englishValue}
              onChange={(e) => setEnglishValue(e.target.value)}
              rows={6}
              dir="ltr"
            />
            {defaultEnglish && (
              <button className="reset-btn" onClick={() => setEnglishValue(defaultEnglish)}>
                Reset to Default
              </button>
            )}
          </div>
        </div>
        <div className="editor-footer">
          <button className="reset-all-btn" onClick={handleReset}>
            Reset Both to Default
          </button>
          <div className="editor-actions">
            <button className="close-btn" onClick={handleClose}>Close</button>
            <button 
              className="save-btn" 
              onClick={handleSaveToFirebase} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InlineEditor
