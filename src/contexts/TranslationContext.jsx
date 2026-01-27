import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { loadTexts, isEditMode } from '../services/textService'

const TranslationContext = createContext()

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

  const loadTranslations = async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      const texts = await loadTexts(forceRefresh)
      setTranslations(texts)
    } catch (error) {
      console.error('Error loading translations:', error)
      const { getDefaults } = await import('../services/textService')
      setTranslations(getDefaults())
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
