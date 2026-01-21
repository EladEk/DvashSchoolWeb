import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext'
import { useTranslation } from '../contexts/TranslationContext'
import './AdminIndicator.css'

const AdminIndicator = () => {
  const { isAdminMode, toggleAdminMode } = useAdmin()
  const { t } = useTranslation()
  const navigate = useNavigate()
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
          <button className="admin-btn exit-btn" onClick={handleExit} title={t('admin.exitAdminMode')}>
            {t('common.exit')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminIndicator
