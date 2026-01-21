import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext'
import { useTranslation } from '../contexts/TranslationContext'
import { getTranslations, saveTranslations, exportTranslations } from '../services/adminService'
import './AdminIndicator.css'

const AdminIndicator = () => {
  const { isAdminMode, toggleAdminMode } = useAdmin()
  const { reloadTranslations } = useTranslation()
  const navigate = useNavigate()
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
    // Just exit admin mode, don't logout (keep session)
    // toggleAdminMode will handle both sessionStorage and state update
    if (isAdminMode) {
      toggleAdminMode()
    }
  }

  const handleEnterAdminMode = () => {
    // Check if user is already logged in
    try {
      const session = JSON.parse(localStorage.getItem('session') || 'null')
      
      if (session) {
        const role = (session.role || '').trim().toLowerCase()
        // Check if user has permission to enter admin mode (admin, editor, or committee)
        if (role === 'admin' || role === 'editor' || role === 'committee' || session.mode === 'system-admin') {
          // User is logged in and has permission - activate admin mode directly
          sessionStorage.setItem('adminAuthenticated', 'true')
          // Update state immediately
          if (!isAdminMode) {
            toggleAdminMode()
          }
          return
        }
      }
    } catch (e) {
      console.error('Error checking session:', e)
    }
    
    // User is not logged in or doesn't have permission - navigate to login page
    navigate('/parliament/login', { 
      state: { from: { pathname: window.location.pathname } },
      replace: false 
    })
  }

  // Show "Enter Admin Mode" button when not in admin mode
  if (!isAdminMode) {
    return (
      <div className="admin-toolbar admin-toolbar-inactive">
        <div className="admin-toolbar-content">
          <span className="admin-badge admin-badge-inactive">View Mode</span>
          <div className="admin-buttons">
            <button 
              className="admin-btn enter-admin-btn" 
              onClick={handleEnterAdminMode} 
              title="Enter admin mode to edit the website"
            >
              Enter Admin Mode
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-content">
        <span className="admin-badge">Admin Mode</span>
        <div className="admin-buttons">
          <Link to="/admin/dashboard" className="admin-btn dashboard-btn" title="Go to Admin Dashboard">
            Dashboard
          </Link>
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
