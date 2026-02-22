import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { loadTexts, getDefaults, isEditMode } from '../services/textService'

const TranslationContext = createContext()

export const TranslationProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to Hebrew
    const savedLanguage = localStorage.getItem('language')
    return savedLanguage || 'he'
  })

  const isE2E = typeof window !== 'undefined' && (
    window.location?.search?.includes('e2e=1') || sessionStorage.getItem('e2e') === '1'
  )
  const [translations, setTranslations] = useState(() => (isE2E ? getDefaults() : null))
  const [isLoading, setIsLoading] = useState(!isE2E)
  const loadingRef = useRef(false) // Prevent double loading in Strict Mode
  const editModeRef = useRef(false) // Track edit mode changes

  useEffect(() => {
    if (isE2E) return
    // Prevent double execution in React Strict Mode
    if (loadingRef.current) return
    loadingRef.current = true

    // Load translations using new text service
    loadTranslations()
  }, [isE2E])

  // When edit mode changes, reload from cache for the new mode (no network clear – cache is split by mode)
  useEffect(() => {
    const checkEditMode = () => {
      const currentEditMode = isEditMode()
      if (currentEditMode !== editModeRef.current) {
        editModeRef.current = currentEditMode
        loadTranslations(false)
      }
    }
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

  const LOAD_TIMEOUT_MS = 8000
  const SAFETY_MAX_MS = 12000

  // Safety: if still loading after SAFETY_MAX_MS, force show app (e.g. E2E / slow env)
  useEffect(() => {
    const id = setTimeout(() => {
      setTranslations((prev) => (prev == null ? getDefaults() : prev))
      setIsLoading(false)
    }, SAFETY_MAX_MS)
    return () => clearTimeout(id)
  }, [])

  const loadTranslations = async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Translation load timeout')), LOAD_TIMEOUT_MS)
      )
      const texts = await Promise.race([loadTexts(forceRefresh), timeout])
      setTranslations(texts)
    } catch (error) {
      if (error?.message !== 'Translation load timeout') {
        console.error('Error loading translations:', error)
      }
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
