import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { findUserByUsername, checkUsernameExists, createUser } from '../services/firebaseDB'
import './ParliamentLogin.css'


async function sha256Hex(text) {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  const bytes = Array.from(new Uint8Array(buf))
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}

function norm(v) {
  return (v || '').trim()
}

/** Get Firebase custom token from API and sign in so Firestore write rules (request.auth != null) allow saves in edit mode. */
async function signInFirebaseWithCustomToken(username, password) {
  const base = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''
  const res = await fetch(`${base}/api/custom-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: norm(username), password: norm(password) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.error || 'Failed to sign in for edit mode')
  }
  const { token } = await res.json()
  if (!token) throw new Error('No token returned')
  const { signInWithCustomToken } = await import('firebase/auth')
  const { auth } = await import('../services/firebase')
  if (!auth) throw new Error('Firebase Auth not available')
  await signInWithCustomToken(auth, token)
}

export default function ParliamentLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Login form
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [registerForm, setRegisterForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    role: 'student',
    birthday: '',
    password: '',
    confirmPassword: '',
  })

  const from = location.state?.from?.pathname || '/parliament'

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const usernameLower = norm(loginUsername).toLowerCase()
      const passwordHash = await sha256Hex(norm(loginPassword))

      // Special admin user (hidden, system-level)
      if (usernameLower === 'admin' && norm(loginPassword) === 'Panda123') {
        await signInFirebaseWithCustomToken(loginUsername, loginPassword)
        const adminSession = {
          uid: 'system-admin',
          username: 'admin',
          usernameLower: 'admin',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'admin',
          displayName: 'System Administrator',
          mode: 'system-admin',
        }
        localStorage.setItem('session', JSON.stringify(adminSession))
        sessionStorage.setItem('adminAuthenticated', 'true')
        sessionStorage.removeItem('justExitedAdminMode') // Remove flag when entering admin mode
        navigate('/admin/dashboard', { replace: true })
        return
      }

      // Search for user
      let userResult
      try {
        userResult = await findUserByUsername(usernameLower)
      } catch (connectionError) {
        // Handle connection/timeout errors separately
        console.error('Firestore connection error:', connectionError)
        setError(
          connectionError.message || 
          t('parliamentLogin.connectionError') || 
          'שגיאת חיבור - אנא בדוק את חיבור האינטרנט ונסה שוב'
        )
        setLoading(false)
        return
      }

      if (!userResult) {
        setError(t('parliamentLogin.userNotFound') || 'משתמש לא נמצא')
        setLoading(false)
        return
      }

      const userData = userResult.data

      if (userData.passwordHash !== passwordHash) {
        setError(t('parliamentLogin.wrongPassword') || 'סיסמה שגויה')
        setLoading(false)
        return
      }

      // Sign in to Firebase Auth so Firestore write rules allow saves in edit mode
      await signInFirebaseWithCustomToken(loginUsername, loginPassword)

      // Support multiple roles per user (roles array or legacy single role)
      const roles = Array.isArray(userData.roles) ? userData.roles : (userData.role ? [userData.role] : [])
      const primaryRole = roles[0] || userData.role || 'student'

      const session = {
        uid: userResult.id,
        username: userData.username,
        usernameLower: userData.usernameLower,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: primaryRole,
        roles,
        displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username,
        mode: 'custom-firestore',
      }

      localStorage.setItem('session', JSON.stringify(session))
      
      // Editor, committee, admin, manager can access admin area (edit site or parliament admin)
      const canAccessAdmin = roles.some(r => ['admin', 'manager', 'editor', 'committee'].includes(String(r).toLowerCase()))
      if (canAccessAdmin) {
        sessionStorage.setItem('adminAuthenticated', 'true')
        sessionStorage.removeItem('justExitedAdminMode') // Remove flag when entering admin mode
        navigate('/admin/dashboard', { replace: true })
        return
      }
      
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      setError(t('parliamentLogin.loginError') || 'שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    // Validation
    if (norm(registerForm.password) !== norm(registerForm.confirmPassword)) {
      setError(t('parliamentLogin.passwordMismatch') || 'הסיסמאות לא תואמות')
      return
    }

    if (norm(registerForm.password).length < 4) {
      setError(t('parliamentLogin.passwordTooShort') || 'הסיסמה חייבת להכיל לפחות 4 תווים')
      return
    }

    // Only allow student or parent registration
    const allowedRoles = ['student', 'parent']
    if (!allowedRoles.includes(registerForm.role)) {
      setError(t('parliamentLogin.invalidRole') || 'ניתן להירשם רק כתלמיד או הורה')
      return
    }

    setLoading(true)

    try {
      const username = norm(registerForm.username)
      const usernameLower = username.toLowerCase()

      // Check if username exists
      let usernameExists
      try {
        usernameExists = await checkUsernameExists(usernameLower)
      } catch (connectionError) {
        // Handle connection/timeout errors separately
        console.error('Firestore connection error:', connectionError)
        setError(
          connectionError.message || 
          t('parliamentLogin.connectionError') || 
          'שגיאת חיבור - אנא בדוק את חיבור האינטרנט ונסה שוב'
        )
        setLoading(false)
        return
      }

      if (usernameExists) {
        setError(t('parliamentLogin.usernameExists') || 'שם משתמש כבר קיים')
        setLoading(false)
        return
      }

      const passwordHash = await sha256Hex(norm(registerForm.password))

      // Create user
      const userResult = await createUser({
        username,
        usernameLower,
        firstName: norm(registerForm.firstName),
        lastName: norm(registerForm.lastName),
        role: registerForm.role,
        birthday: registerForm.birthday || '',
        passwordHash,
      })

      // Create session
      const session = {
        uid: userResult.id,
        username,
        usernameLower,
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        role: registerForm.role,
        displayName: `${registerForm.firstName || ''} ${registerForm.lastName || ''}`.trim() || username,
        mode: 'custom-firestore',
      }

      localStorage.setItem('session', JSON.stringify(session))
      
      // Student and parent users go to parliament page
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Registration error:', err)
      setError(t('parliamentLogin.registerError') || 'שגיאה ברישום')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="parliament-login-page">
      <div className="parliament-login-container">
        <h1 className="parliament-login-title">
          {isLogin
            ? t('parliamentLogin.loginTitle') || 'התחבר לפרלמנט'
            : t('parliamentLogin.registerTitle') || 'הירשם לפרלמנט'}
        </h1>

        <div className="parliament-login-tabs">
          <button
            className={`parliament-tab ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(true)
              setError('')
            }}
          >
            {t('parliamentLogin.login') || 'התחבר'}
          </button>
          <button
            className={`parliament-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false)
              setError('')
            }}
          >
            {t('parliamentLogin.register') || 'הירשם'}
          </button>
        </div>

        {error && <div className="parliament-error">{error}</div>}

        {isLogin ? (
          <form onSubmit={handleLogin} className="parliament-login-form">
            <div className="parliament-form-group">
              <label>{t('parliamentLogin.username') || 'שם משתמש'}</label>
              <input
                type="text"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
                maxLength={50}
              />
            </div>
            <div className="parliament-form-group">
              <label>{t('parliamentLogin.password') || 'סיסמה'}</label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary parliament-submit-btn"
              disabled={loading}
            >
              {loading
                ? t('parliamentLogin.loggingIn') || 'מתחבר...'
                : t('parliamentLogin.login') || 'התחבר'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="parliament-login-form">
            <div className="parliament-form-row">
              <div className="parliament-form-group">
                <label>{t('parliamentLogin.username') || 'שם משתמש'}</label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={e =>
                    setRegisterForm({ ...registerForm, username: e.target.value })
                  }
                  required
                  disabled={loading}
                  autoComplete="username"
                  maxLength={50}
                />
              </div>
              <div className="parliament-form-group">
                <label>{t('parliamentLogin.firstName') || 'שם פרטי'}</label>
                <input
                  type="text"
                  value={registerForm.firstName}
                  onChange={e =>
                    setRegisterForm({ ...registerForm, firstName: e.target.value })
                  }
                  required
                  disabled={loading}
                  autoComplete="given-name"
                />
              </div>
            </div>
            <div className="parliament-form-row">
              <div className="parliament-form-group">
                <label>{t('parliamentLogin.lastName') || 'שם משפחה'}</label>
                <input
                  type="text"
                  value={registerForm.lastName}
                  onChange={e =>
                    setRegisterForm({ ...registerForm, lastName: e.target.value })
                  }
                  required
                  disabled={loading}
                  autoComplete="family-name"
                />
              </div>
              <div className="parliament-form-group">
                <label>{t('parliamentLogin.role') || 'תפקיד'}</label>
                <select
                  value={registerForm.role}
                  onChange={e =>
                    setRegisterForm({ ...registerForm, role: e.target.value })
                  }
                  required
                  disabled={loading}
                >
                  <option value="student">{t('users.role.student') || 'תלמיד'}</option>
                  <option value="parent">{t('users.role.parent') || 'הורה'}</option>
                  {/* Only student and parent roles available for registration */}
                  {/* Managers/admins can change user roles later */}
                </select>
              </div>
            </div>
            <div className="parliament-form-group">
              <label>{t('parliamentLogin.birthday') || 'תאריך לידה'}</label>
              <input
                type="date"
                value={registerForm.birthday}
                onChange={e =>
                  setRegisterForm({ ...registerForm, birthday: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="parliament-form-row">
              <div className="parliament-form-group">
                <label>{t('parliamentLogin.password') || 'סיסמה'}</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={e =>
                    setRegisterForm({ ...registerForm, password: e.target.value })
                  }
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={4}
                  maxLength={100}
                />
              </div>
              <div className="parliament-form-group">
                <label>{t('parliamentLogin.confirmPassword') || 'אישור סיסמה'}</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={e =>
                    setRegisterForm({ ...registerForm, confirmPassword: e.target.value })
                  }
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={4}
                  maxLength={100}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary parliament-submit-btn"
              disabled={loading}
            >
              {loading
                ? t('parliamentLogin.registering') || 'נרשם...'
                : t('parliamentLogin.register') || 'הירשם'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
