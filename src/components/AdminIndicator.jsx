import { useState } from 'react'
import { useAdmin } from '../contexts/AdminContext'
import { useTranslation } from '../contexts/TranslationContext'
import { getTranslations, saveTranslations, exportTranslations } from '../services/adminService'
import './AdminIndicator.css'

const AdminIndicator = () => {
  const { isAdminMode } = useAdmin()
  const { reloadTranslations } = useTranslation()
  const [message, setMessage] = useState('')

  const handleExport = async () => {
    try {
      // Load translations quickly (skip Firebase)
      const translations = await getTranslations(true)
      exportTranslations(translations)
      setMessage('Files exported successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error exporting:', error)
      setMessage('Error exporting files')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.multiple = true
    
    input.onchange = async (e) => {
      const files = e.target.files
      if (files.length === 0) return

      try {
        const translations = { he: {}, en: {} }
        
        for (const file of files) {
          const text = await file.text()
          const data = JSON.parse(text)
          
          if (file.name === 'he.json' || file.name.includes('he')) {
            translations.he = data
          } else if (file.name === 'en.json' || file.name.includes('en')) {
            translations.en = data
          }
        }

        // Validate that we have both languages
        if (Object.keys(translations.he).length === 0 || Object.keys(translations.en).length === 0) {
          alert('Please import both he.json and en.json files')
          return
        }

        // Save to localStorage and Firebase
        await saveTranslations(translations)
        await reloadTranslations()
        
        setMessage('Translations imported successfully!')
        setTimeout(() => setMessage(''), 3000)
      } catch (error) {
        console.error('Error importing:', error)
        alert('Error importing files. Please make sure the files are valid JSON.')
      }
    }
    
    input.click()
  }


  const handleExit = () => {
    if (confirm('Exit admin mode? Unsaved changes will be lost.')) {
      sessionStorage.removeItem('adminAuthenticated')
      window.location.reload()
    }
  }

  if (!isAdminMode) {
    return null
  }

  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-content">
        <span className="admin-badge">Admin Mode</span>
        <div className="admin-buttons">
          <button className="admin-btn export-btn" onClick={handleExport} title="Export translations to JSON files">
            Export
          </button>
          <button className="admin-btn import-btn" onClick={handleImport} title="Import translations from JSON files">
            Import
          </button>
          <button className="admin-btn exit-btn" onClick={handleExit} title="Exit admin mode">
            Exit
          </button>
        </div>
      </div>
      {message && (
        <div className={`admin-message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
    </div>
  )
}

export default AdminIndicator
