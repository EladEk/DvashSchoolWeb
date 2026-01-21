import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { getTranslations, saveTranslations, exportTranslations } from '../services/adminService'
import UsersAdmin from '../components/admin/UsersAdmin'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const { reloadTranslations } = useTranslation()
  const [translations, setTranslations] = useState({ he: {}, en: {} })
  const [currentLang, setCurrentLang] = useState('he')
  const [editedTranslations, setEditedTranslations] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('translations')

  useEffect(() => {
    loadTranslations()
  }, [])

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
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <Link to="/admin/parliament" className="admin-link">Parliament Admin</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="admin-nav">
        <button
          className={`admin-tab ${activeTab === 'translations' ? 'active' : ''}`}
          onClick={() => setActiveTab('translations')}
        >
          Translation Editor
        </button>
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users Management
        </button>
      </div>

      {activeTab === 'users' && <UsersAdmin />}

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
            <span className="unsaved-indicator">You have unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="save-btn"
          >
            {saving ? 'Saving...' : 'Save to Firebase'}
          </button>
          <button onClick={handleExport} className="export-btn">
            Export JSON Files
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
