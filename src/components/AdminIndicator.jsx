import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext'
import { useTranslation } from '../contexts/TranslationContext'
import { getTranslations, saveTranslations, exportTranslations } from '../services/adminService'
import './AdminIndicator.css'

const AdminIndicator = () => {
  const { isAdminMode, toggleAdminMode } = useAdmin()
  const { t, reloadTranslations } = useTranslation()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [showEnterButton, setShowEnterButton] = useState(false)
  const [hasParliamentAccess, setHasParliamentAccess] = useState(false)

  // Check if user has admin or committee role for Parliament Admin access
  useEffect(() => {
    const checkParliamentAccess = () => {
      try {
        const session = JSON.parse(localStorage.getItem('session') || 'null')
        if (session) {
          const role = (session.role || '').trim().toLowerCase()
          const hasAccess = role === 'admin' || role === 'committee' || session.mode === 'system-admin'
          setHasParliamentAccess(hasAccess)
        } else {
          setHasParliamentAccess(false)
        }
      } catch (e) {
        setHasParliamentAccess(false)
      }
    }

    checkParliamentAccess()
    // Check periodically for session changes
    const interval = setInterval(checkParliamentAccess, 1000)
    
    // Listen to storage events (for cross-tab updates and logout)
    const handleStorageChange = (e) => {
      if (e.key === 'session') {
        checkParliamentAccess()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Check if user just exited admin mode
  useEffect(() => {
    const justExited = sessionStorage.getItem('justExitedAdminMode') === 'true'
    setShowEnterButton(justExited)
  }, [isAdminMode])

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
      // Mark that user just exited admin mode
      sessionStorage.setItem('justExitedAdminMode', 'true')
      toggleAdminMode()
      setShowEnterButton(true)
    }
  }

  const handleEnterAdminMode = () => {
    // Remove the flag when entering admin mode
    sessionStorage.removeItem('justExitedAdminMode')
    setShowEnterButton(false)
    
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

  // Don't show anything if not in admin mode
  if (!isAdminMode) {
    return null
  }

  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-content">
        <span className="admin-badge">{t('admin.dashboard')}</span>
        <div className="admin-buttons">
          <Link to="/admin/dashboard" className="admin-btn dashboard-btn" title={t('admin.goToAdminDashboard')}>
            {t('common.dashboard')}
          </Link>
          {hasParliamentAccess && (
            <Link to="/admin/parliament" className="admin-btn parliament-btn" title={t('admin.parliamentAdmin')}>
              {t('admin.parliamentAdmin')}
            </Link>
          )}
          <button className="admin-btn export-btn" onClick={handleExport} title={t('admin.exportTranslations')}>
            {t('common.export')}
          </button>
          <button className="admin-btn import-btn" onClick={handleImport} title={t('admin.importTranslations')}>
            {t('common.import')}
          </button>
          <button className="admin-btn exit-btn" onClick={handleExit} title={t('admin.exitAdminMode')}>
            {t('common.exit')}
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
