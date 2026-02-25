import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext'
import { useTranslation } from '../contexts/TranslationContext'
import * as cacheService from '../services/cacheService'
import './AdminIndicator.css'

const AdminIndicator = () => {
  const { isAdminMode, toggleAdminMode } = useAdmin()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showEnterButton, setShowEnterButton] = useState(false)
  const [hasParliamentAccess, setHasParliamentAccess] = useState(false)
  const [hasEditAccess, setHasEditAccess] = useState(false)

  // Edit access: admin, manager, editor only. Parliament access: admin, manager, committee.
  useEffect(() => {
    const checkAccess = () => {
      try {
        const session = JSON.parse(localStorage.getItem('session') || 'null')
        if (session) {
          const sessionRoles = session?.roles || (session?.role ? [session.role] : [])
          const r = sessionRoles.map(x => String(x).trim().toLowerCase())
          setHasParliamentAccess(r.some(x => ['admin', 'manager', 'committee'].includes(x)) || session.mode === 'system-admin')
          setHasEditAccess(r.some(x => ['admin', 'manager', 'editor'].includes(x)) || session.mode === 'system-admin')
        } else {
          setHasParliamentAccess(false)
          setHasEditAccess(false)
        }
      } catch (e) {
        setHasParliamentAccess(false)
        setHasEditAccess(false)
      }
    }

    checkAccess()
    // Check periodically for session changes
    const interval = setInterval(checkAccess, 1000)
    
    // Listen to storage events (for cross-tab updates and logout)
    const handleStorageChange = (e) => {
      if (e.key === 'session') {
        checkAccess()
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

  const handleClearSiteCache = () => {
    cacheService.clearAll()
    window.location.reload()
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
        const sessionRoles = (session?.roles || (session?.role ? [session.role] : [])).map(x => String(x).trim().toLowerCase())
        if (sessionRoles.some(x => ['admin', 'manager', 'editor'].includes(x)) || session.mode === 'system-admin') {
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
          {hasEditAccess && (
            <button type="button" className="admin-btn" onClick={handleClearSiteCache} title={t('admin.clearSiteCache')}>
              {t('admin.clearSiteCache')}
            </button>
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
