import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { loadTexts, isEditMode } from '../services/textService'
import heTranslations from '../translations/he.json'
import enTranslations from '../translations/en.json'

const TranslationContext = createContext()

// Default translations (fallback) - Parliament excluded
const defaultTranslations = {
  he: heTranslations,
  en: enTranslations
}

export const TranslationProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to Hebrew
    const savedLanguage = localStorage.getItem('language')
    return savedLanguage || 'he'
  })

  const [translations, setTranslations] = useState(null) // Start with null instead of defaults
  const [isLoading, setIsLoading] = useState(true) // Track loading state
  const loadingRef = useRef(false) // Prevent double loading in Strict Mode
  const editModeRef = useRef(false) // Track edit mode changes

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (loadingRef.current) return
    loadingRef.current = true
    
    // Load translations using new text service
    loadTranslations()
  }, [])

  // Reload translations when edit mode changes
  useEffect(() => {
    const checkEditMode = () => {
      const currentEditMode = isEditMode()
      if (currentEditMode !== editModeRef.current) {
        editModeRef.current = currentEditMode
        loadTranslations(true) // Force refresh when mode changes
      }
    }

    // Check periodically for edit mode changes
    const interval = setInterval(checkEditMode, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Save language preference to localStorage
    localStorage.setItem('language', language)
    // Update HTML dir attribute for RTL/LTR
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  // Deep merge function to properly merge nested objects
  const deepMerge = (target, source) => {
    if (!source || typeof source !== 'object') {
      return target
    }
    
    const result = { ...target }
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key]) &&
          target[key] &&
          typeof target[key] === 'object' &&
          !Array.isArray(target[key])
        ) {
          // Recursively merge nested objects
          result[key] = deepMerge(target[key], source[key])
        } else {
          // Overwrite with source value (or set if doesn't exist)
          result[key] = source[key]
        }
      }
    }
    
    return result
  }

  const loadTranslations = async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      
      // Use new text service which handles production vs edit mode automatically
      // Parliament data is automatically excluded
      const loadedTranslations = await loadTexts(forceRefresh)
      
      // Deep merge with defaults to ensure all keys exist and nested structures are preserved
      const mergedTranslations = {
        he: deepMerge(defaultTranslations.he, loadedTranslations?.he || {}),
        en: deepMerge(defaultTranslations.en, loadedTranslations?.en || {})
      }
      
      // Fix nav.parents translation if it has the wrong value
      // Ensure it's "וועד ההורים" instead of "וועד הורים בית ספרי"
      if (mergedTranslations.he?.nav?.parents === "וועד הורים בית ספרי") {
        mergedTranslations.he.nav.parents = "וועד ההורים"
        // Save the fix to Firebase if in edit mode (async, don't wait)
        if (isEditMode()) {
          import('../services/textService').then(({ saveTexts }) => {
            saveTexts(mergedTranslations).catch(() => {
              // Silently fail - translation fix is optional
            })
          })
        }
      }
      
      setTranslations(mergedTranslations)
    } catch (error) {
      console.error('Error loading translations:', error)
      // Fallback to default translations
      setTranslations(defaultTranslations)
    } finally {
      setIsLoading(false)
    }
  }

  const t = (key) => {
    // Return key if translations not loaded yet
    if (!translations) {
      return key
    }
    
    const keys = key.split('.')
    let value = translations[language]
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    return value || key
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)
  }

  // Expose reload function for admin dashboard
  // forceRefresh: if true, will force refresh from source (bypass cache)
  const reloadTranslations = async (forceRefresh = false) => {
    await loadTranslations(forceRefresh)
  }

  return (
    <TranslationContext.Provider value={{ t, language, changeLanguage, reloadTranslations, isLoading }}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = () => {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}
