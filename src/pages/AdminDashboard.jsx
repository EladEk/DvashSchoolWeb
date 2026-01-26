import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { useEffectiveRole } from '../utils/requireRole'
import { getTranslations, saveTranslations } from '../services/adminService'
import { publishTexts } from '../services/textService'
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
  const [publishing, setPublishing] = useState(false)
  const [savingJson, setSavingJson] = useState(false)
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
      setMessage('Error saving translations')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    setSavingJson(true)
    setMessage('')
    try {
      // Use the same logic as publish but save locally without GitHub
      const { loadTexts } = await import('../services/textService')
      const currentTexts = await loadTexts(true) // Force refresh from source
      
      // Call API to save JSON files locally (same files as publish)
      const apiEndpoint = process.env.NODE_ENV === 'development'
        ? '/api/save-json-local'
        : '/api/save-json-local'
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: currentTexts
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.message || errorData.error || 'Failed to save JSON files')
      }

      const result = await response.json()
      setMessage('✅ JSON files saved successfully to content/texts.json and public/content/texts.json')
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      setMessage(`❌ Error saving JSON files: ${error.message || 'Unknown error'}`)
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setSavingJson(false)
    }
  }

  const handlePublish = async () => {
    // Prevent multiple clicks
    if (publishing) {
      return
    }

    if (!confirm('Publish texts to GitHub? This will update the production site texts.')) {
      return
    }

    setPublishing(true)
    setMessage('')
    
    try {
      const commitMessage = prompt('Enter commit message (optional):') || 
        `Update site texts - ${new Date().toISOString()}`
      
      const result = await publishTexts(commitMessage)
      
      setMessage(`✅ Published successfully! Commit: ${result.commit?.sha?.substring(0, 7) || result.files?.[0]?.sha?.substring(0, 7) || 'N/A'}`)
      setTimeout(() => setMessage(''), 5000)
      
      // Reload translations to get fresh data from GitHub
      await reloadTranslations(true)
      await loadTranslations()
    } catch (error) {
      const errorMsg = error.message || 'Unknown error'
      const errorDetails = error.details ? `\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''
      const errorHint = error.details?.hint ? `\nHint: ${error.details.hint}` : ''
      setMessage(`❌ Error publishing: ${errorMsg}${errorDetails}${errorHint}`)
      setTimeout(() => setMessage(''), 10000) // Show longer for detailed errors
    } finally {
      setPublishing(false)
    }
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
          <button 
            onClick={handlePublish} 
            disabled={publishing || hasChanges}
            className="publish-btn"
            title={hasChanges ? 'Save changes before publishing' : 'Publish texts to GitHub'}
          >
            {publishing ? (
              <>
                <span className="spinner"></span>
                Publishing...
              </>
            ) : (
              'Publish to GitHub'
            )}
          </button>
          <button 
            onClick={handleExport} 
            disabled={savingJson || hasChanges}
            className="export-btn"
            title={hasChanges ? 'Save changes before exporting' : 'Save JSON files locally'}
          >
            {savingJson ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              t('admin.saveJsonFiles') || 'Save JSON Files'
            )}
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
