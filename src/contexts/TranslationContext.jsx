import { createContext, useContext, useState, useEffect } from 'react'
import { getTranslations } from '../services/adminService'
import heTranslations from '../translations/he.json'
import enTranslations from '../translations/en.json'

const TranslationContext = createContext()

// Default translations (fallback)
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

  useEffect(() => {
    // Load translations from admin storage or Firebase
    loadTranslations()
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

  const loadTranslations = async () => {
    try {
      setIsLoading(true)
      // Load translations - try Firebase first, then fallback to localStorage/defaults
      // Don't skip Firebase on initial load so we get the latest from database
      const adminTranslations = await getTranslations(false) // false = don't skip Firebase
      
      // Deep merge with defaults to ensure all keys exist and nested structures are preserved
      const mergedTranslations = {
        he: deepMerge(defaultTranslations.he, adminTranslations?.he || {}),
        en: deepMerge(defaultTranslations.en, adminTranslations?.en || {})
      }
      
      setTranslations(mergedTranslations)
    } catch (error) {
      console.error('Error loading admin translations:', error)
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
    
    // If value is not found, log for debugging
    if (!value || value === key) {
      console.warn(`⚠️ Translation key "${key}" not found in ${language}. Available keys:`, Object.keys(translations[language] || {}))
    }
    
    return value || key
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)
  }

  // Expose reload function for admin dashboard
  const reloadTranslations = async () => {
    await loadTranslations()
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
