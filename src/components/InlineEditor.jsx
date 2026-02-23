import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
    // Ensure obj is an object
    if (!obj || typeof obj !== 'object') {
      throw new Error('Cannot set nested value: object is null or undefined')
    }
    
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
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {}
        }
        current = current[key]
      }
    }
    
    // Set the final value
    const finalKey = keysArray[keysArray.length - 1]
    current[finalKey] = value
  }

  const pathTouchesArray = (root, keyPath) => {
    if (!root || typeof root !== 'object') return false
    const parts = keyPath.split('.')
    let current = root
    for (let i = 0; i < parts.length - 1; i++) {
      if (Array.isArray(current)) return true
      current = current?.[parts[i]]
      if (current == null) return false
    }
    return Array.isArray(current)
  }

  // Paths like sections.0.title or parentsAssociationSections.0.text must save full doc;
  // otherwise Firestore merge can replace the whole array/object with one index (same fix as main sections).
  const SECTION_ARRAY_KEYS = ['sections', 'parentsAssociationSections']
  const pathIsSectionArrayIndex = (keyPath) => {
    const parts = keyPath.split('.')
    if (parts.length < 2) return false
    return SECTION_ARRAY_KEYS.includes(parts[0]) && /^\d+$/.test(parts[1])
  }

  // Auto-save to localStorage when closing
  const saveChanges = useCallback(async (skipOnSave = false) => {
    try {
      // Load translations quickly (skip Firebase)
      const current = await getTranslations(true)
      
      // Ensure current.he and current.en are objects
      if (!current.he || typeof current.he !== 'object') {
        current.he = {}
      }
      if (!current.en || typeof current.en !== 'object') {
        current.en = {}
      }
      
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
      
      // Only call onSave if not skipped (skip when called from handleSaveToFirebase)
      if (!skipOnSave && onSave && typeof onSave === 'function') {
        try {
          onSave()
        } catch (saveError) {
          console.error('Error in onSave callback:', saveError)
        }
      }

      return current
    } catch (error) {
      console.error('Error saving:', error)
      throw error // Re-throw to allow caller to handle
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
      
      // Step 1: Save to localStorage first (fast, synchronous)
      // Skip onSave callback to avoid re-render issues during save
      let updatedTranslations
      try {
        updatedTranslations = await saveChanges(true) // Pass true to skip onSave
      } catch (localError) {
        console.error('Error saving to localStorage:', localError)
        setSaveMessage('Error saving locally: ' + (localError.message || 'Unknown error'))
        setSaving(false)
        return
      }
      
      // Step 2: Save to Firebase
      // Array paths (e.g. sections.0.title) must save the full object, otherwise
      // Firestore partial merge can replace the whole array with just one index.
      try {
        const { saveTranslationToDB, saveAllTranslationsToDB } = await import('../services/firebaseDB')
        const mustSaveWholeDoc =
          pathTouchesArray(updatedTranslations?.he, translationKey) ||
          pathTouchesArray(updatedTranslations?.en, translationKey) ||
          pathIsSectionArrayIndex(translationKey)

        if (mustSaveWholeDoc) {
          await saveAllTranslationsToDB(updatedTranslations || {})
        } else {
          await saveTranslationToDB(translationKey, hebrewValue, englishValue)
        }
      } catch (firebaseError) {
        console.error('❌ Error saving to Firebase:', firebaseError)
        // Even if Firebase fails, localStorage save succeeded, so show warning
        const errorMessage = firebaseError.message || 'Unknown error'
        setSaveMessage('Saved locally, but Firebase error: ' + errorMessage)
        setTimeout(() => {
          setSaveMessage('')
          setSaving(false)
          onClose()
        }, 3000) // Show error for 3 seconds
        return
      }
      
      // Step 3: Update UI from localStorage (no Firebase read)
      clearTranslationsCache() // Clear cache to force reload
      reloadTranslations().catch(console.error) // Uses getTranslations(true) - skips Firebase
      
      // Step 4: Call onSave callback after successful save
      if (onSave && typeof onSave === 'function') {
        try {
          onSave()
        } catch (saveError) {
          console.error('Error in onSave callback:', saveError)
        }
      }
      
      setSaveMessage('Saved to Firebase!')
      setTimeout(() => {
        setSaveMessage('')
        setSaving(false)
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Unexpected error saving:', error)
      setSaveMessage('Error saving: ' + (error.message || 'Unknown error'))
      setTimeout(() => setSaveMessage(''), 3000)
      setSaving(false)
    }
  }, [translationKey, hebrewValue, englishValue, saveChanges, onClose, reloadTranslations, onSave])

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
    if (confirm(t('inlineEditor.confirmReset') || 'לאפס לערכי ברירת מחדל?')) {
      setHebrewValue(defaultHebrew)
      setEnglishValue(defaultEnglish)
    }
  }

  const modalContent = (
    <div className="inline-editor-overlay" onClick={handleClose}>
      <div className="inline-editor-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h3>{t('inlineEditor.title') || 'עריכת תרגום'}: {translationKey}</h3>
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
                {t('inlineEditor.resetToDefault') || 'איפוס לברירת מחדל'}
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
                {t('inlineEditor.resetToDefault') || 'איפוס לברירת מחדל'}
              </button>
            )}
          </div>
        </div>
        <div className="editor-footer">
          <button className="reset-all-btn" onClick={handleReset}>
            {t('inlineEditor.resetBoth') || 'איפוס שניהם לברירת מחדל'}
          </button>
          <div className="editor-actions">
            <button className="close-btn" onClick={handleClose} disabled={saving}>
              {t('common.close') || 'סגור'}
            </button>
            <button 
              className="save-btn" 
              onClick={handleSaveToFirebase} 
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="save-spinner"></span>
                  <span>{t('common.saving') || 'שומר...'}</span>
                </>
              ) : (
                t('common.save') || 'שמור'
              )}
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

  if (loading) {
    const loadingContent = (
      <div className="inline-editor-overlay" onClick={handleClose}>
        <div className="inline-editor-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
    return createPortal(loadingContent, document.body)
  }

  // Use portal to render outside the DOM hierarchy (on top of everything)
  return createPortal(modalContent, document.body)
}

export default InlineEditor
