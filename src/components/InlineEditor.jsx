import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { getTranslations, saveTranslations } from '../services/adminService'
import './InlineEditor.css'

const InlineEditor = ({ translationKey, onClose, onSave }) => {
  const { t, reloadTranslations } = useTranslation()
  const [hebrewValue, setHebrewValue] = useState('')
  const [englishValue, setEnglishValue] = useState('')
  const [defaultHebrew, setDefaultHebrew] = useState('')
  const [defaultEnglish, setDefaultEnglish] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const modalRef = useRef(null)

  useEffect(() => {
    loadValues()
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [translationKey])

  useEffect(() => {
    // Close on click outside
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadValues = async () => {
    try {
      setLoading(true)
      // Load current translations
      const current = await getTranslations()
      
      // Load default translations from JSON files
      const heDefault = await import('../translations/he.json')
      const enDefault = await import('../translations/en.json')

      // Get values using the translation key
      const keys = translationKey.split('.')
      
      let currentHe = current.he
      let currentEn = current.en
      let defaultHe = heDefault.default
      let defaultEn = enDefault.default

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
          let parentDefaultHe = heDefault.default
          let parentDefaultEn = enDefault.default

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
    for (let i = 0; i < keysArray.length - 1; i++) {
      const key = keysArray[i]
      if (!current[key]) {
        current[key] = {}
      }
      current = current[key]
    }
    current[keysArray[keysArray.length - 1]] = value
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const current = await getTranslations()
      
      // Update both Hebrew and English translations
      setNestedValue(current.he, translationKey, hebrewValue)
      setNestedValue(current.en, translationKey, englishValue)

      // Only save to localStorage (not Firebase yet - user must click Save button)
      localStorage.setItem('admin_translations', JSON.stringify(current))
      await reloadTranslations()
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving translation')
    } finally {
      setSaving(false)
    }
  }

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
          <button className="close-btn" onClick={onClose}>×</button>
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
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InlineEditor
