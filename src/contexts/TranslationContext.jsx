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

  const [translations, setTranslations] = useState(defaultTranslations)

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

  const loadTranslations = async () => {
    try {
      // Load translations (skip Firebase on initial load for speed)
      const adminTranslations = await getTranslations(true)
      // If admin translations exist, use them; otherwise use defaults
      if (adminTranslations && Object.keys(adminTranslations.he || {}).length > 0) {
        setTranslations(adminTranslations)
      }
    } catch (error) {
      console.error('Error loading admin translations:', error)
      // Fallback to default translations
    }
  }

  const t = (key) => {
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
  const reloadTranslations = async () => {
    await loadTranslations()
  }

  return (
    <TranslationContext.Provider value={{ t, language, changeLanguage, reloadTranslations }}>
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
