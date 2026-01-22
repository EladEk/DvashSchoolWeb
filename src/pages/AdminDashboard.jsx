import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { useEffectiveRole } from '../utils/requireRole'
import { getTranslations, saveTranslations, exportTranslations } from '../services/adminService'
import UsersAdmin from '../components/admin/UsersAdmin'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const { t, reloadTranslations } = useTranslation()
  const { role, phase } = useEffectiveRole()
  
  // Also check session directly as fallback - use useMemo to ensure it's calculated correctly
  const session = (() => {
    try {
      const sess = JSON.parse(localStorage.getItem('session') || '{}') || {}
      return sess
    } catch (e) {
      console.error('AdminDashboard - error parsing session:', e)
      return {}
    }
  })()
  const sessionRole = (session?.role || '').trim()
  
  // Use role from hook if available, otherwise use session role
  const effectiveRole = (role || sessionRole).trim()
  
  const [translations, setTranslations] = useState({ he: {}, en: {} })
  const [currentLang, setCurrentLang] = useState('he')
  const [editedTranslations, setEditedTranslations] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('translations')
  
  // Check if user has permission (editor or admin can edit translations, only admin can manage users)
  // Use sessionRole immediately if effectiveRole is not yet loaded
  const currentRole = effectiveRole || sessionRole
  const canEditTranslations = currentRole === 'admin' || currentRole === 'editor'
  const canManageUsers = currentRole === 'admin'
  

  const loadTranslations = async () => {
    try {
      const data = await getTranslations()
      setTranslations(data)
      setEditedTranslations(data)
    } catch (error) {
      console.error('Error loading translations:', error)
      setMessage('Error loading translations')
    }
  }

  useEffect(() => {
    loadTranslations()
  }, [])
  
  // Show loading while checking role (after all hooks)
  if (phase === 'checking' && !sessionRole) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>בודק הרשאות...</div>
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated')
    navigate('/admin')
  }

  const handleValueChange = (path, value) => {
    const newTranslations = { ...editedTranslations }
    const keys = path.split('.')
    let current = newTranslations[currentLang]

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }

    current[keys[keys.length - 1]] = value
    setEditedTranslations(newTranslations)
    setHasChanges(true)
    setMessage('')
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await saveTranslations(editedTranslations)
      setTranslations(editedTranslations)
      setHasChanges(false)
      // Reload translations in the app context
      await reloadTranslations()
      setMessage('Translations saved successfully! The website will now use the updated translations.')
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('Error saving translations:', error)
      setMessage('Error saving translations')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    exportTranslations(editedTranslations)
    setMessage('Translation files exported! Check your downloads.')
    setTimeout(() => setMessage(''), 3000)
  }

  const renderEditor = (obj, path = '') => {
    return Object.keys(obj).map((key) => {
      const currentPath = path ? `${path}.${key}` : key
      const value = obj[key]

      if (typeof value === 'object' && !Array.isArray(value)) {
        return (
          <div key={currentPath} className="section-group">
            <h3 className="section-title">{key}</h3>
            <div className="section-content">
              {renderEditor(value, currentPath)}
            </div>
          </div>
        )
      } else if (Array.isArray(value)) {
        return (
          <div key={currentPath} className="array-group">
            <h3 className="section-title">{key}</h3>
            {value.map((item, index) => (
              <div key={index} className="array-item">
                {Object.keys(item).map((itemKey) => {
                  const itemPath = `${currentPath}.${index}.${itemKey}`
                  return (
                    <div key={itemPath} className="field-group">
                      <label>{itemKey}</label>
                      <textarea
                        value={item[itemKey] || ''}
                        onChange={(e) => handleValueChange(itemPath, e.target.value)}
                        rows={4}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )
      } else {
        return (
          <div key={currentPath} className="field-group">
            <label>{key}</label>
            <textarea
              value={value || ''}
              onChange={(e) => handleValueChange(currentPath, e.target.value)}
              rows={value && value.length > 100 ? 4 : 2}
            />
          </div>
        )
      }
    })
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>{t('admin.dashboard')}</h1>
        <div className="admin-actions">
          <button onClick={handleLogout} className="logout-btn">{t('common.logout')}</button>
        </div>
      </div>

      {!canEditTranslations && !canManageUsers && effectiveRole && (
        <div className="admin-message error">
          {t('users.noPermission')} ({t('users.roleLabel')}: {effectiveRole})
        </div>
      )}
      
      {!canEditTranslations && !canManageUsers && !effectiveRole && phase !== 'checking' && (
        <div className="admin-message error">
          {t('users.noPermission')}
        </div>
      )}

      {canEditTranslations && (
        <div className="admin-nav">
          <button
            className={`admin-tab ${activeTab === 'translations' ? 'active' : ''}`}
            onClick={() => setActiveTab('translations')}
          >
            {t('admin.translationEditor')}
          </button>
          {canManageUsers && (
            <button
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              {t('admin.usersManagement')}
            </button>
          )}
        </div>
      )}

      {activeTab === 'users' && canManageUsers && <UsersAdmin />}

      <div className="admin-controls">
        <div className="lang-selector">
          <button
            className={`lang-btn ${currentLang === 'he' ? 'active' : ''}`}
            onClick={() => setCurrentLang('he')}
          >
            Hebrew (עברית)
          </button>
          <button
            className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
            onClick={() => setCurrentLang('en')}
          >
            English
          </button>
        </div>

        <div className="save-controls">
          {hasChanges && (
            <span className="unsaved-indicator">{t('admin.unsavedChanges')}</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="save-btn"
          >
            {saving ? t('common.saving') : t('admin.saveToFirebase')}
          </button>
          <button onClick={handleExport} className="export-btn">
            {t('admin.exportJsonFiles')}
          </button>
        </div>
      </div>

      {activeTab === 'translations' && (
        <>
          {message && (
            <div className={`admin-message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <div className="translation-editor">
            {editedTranslations[currentLang] && renderEditor(editedTranslations[currentLang])}
          </div>
        </>
      )}
    </div>
  )
}

export default AdminDashboard
