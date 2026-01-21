import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useTranslation } from '../contexts/TranslationContext'
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
      const q = query(
        collection(db, 'appUsers'),
        where('usernameLower', '==', usernameLower)
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setError(t('parliamentLogin.userNotFound') || 'משתמש לא נמצא')
        setLoading(false)
        return
      }

      const userDoc = snapshot.docs[0]
      const userData = userDoc.data()

      if (userData.passwordHash !== passwordHash) {
        setError(t('parliamentLogin.wrongPassword') || 'סיסמה שגויה')
        setLoading(false)
        return
      }

      // Create session
      const session = {
        uid: userDoc.id,
        username: userData.username,
        usernameLower: userData.usernameLower,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username,
        mode: 'custom-firestore',
      }

      localStorage.setItem('session', JSON.stringify(session))
      
      // If admin/editor/committee login, also set adminAuthenticated and redirect to admin dashboard
      if (userData.role === 'admin' || userData.role === 'editor' || userData.role === 'committee') {
        sessionStorage.setItem('adminAuthenticated', 'true')
        sessionStorage.removeItem('justExitedAdminMode') // Remove flag when entering admin mode
        // Auto-redirect admin/editor/committee to admin dashboard
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

    setLoading(true)

    try {
      const username = norm(registerForm.username)
      const usernameLower = username.toLowerCase()

      // Check if username exists
      const q = query(
        collection(db, 'appUsers'),
        where('usernameLower', '==', usernameLower)
      )
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        setError(t('parliamentLogin.usernameExists') || 'שם משתמש כבר קיים')
        setLoading(false)
        return
      }

      const passwordHash = await sha256Hex(norm(registerForm.password))

      // Create user
      const userRef = await addDoc(collection(db, 'appUsers'), {
        username,
        usernameLower,
        firstName: norm(registerForm.firstName),
        lastName: norm(registerForm.lastName),
        role: registerForm.role,
        birthday: registerForm.birthday || '',
        passwordHash,
        createdAt: serverTimestamp(),
      })

      // Create session
      const session = {
        uid: userRef.id,
        username,
        usernameLower,
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        role: registerForm.role,
        displayName: `${registerForm.firstName || ''} ${registerForm.lastName || ''}`.trim() || username,
        mode: 'custom-firestore',
      }

      localStorage.setItem('session', JSON.stringify(session))
      
      // If admin/editor/committee registration, also set adminAuthenticated and redirect to admin dashboard
      if (registerForm.role === 'admin' || registerForm.role === 'editor' || registerForm.role === 'committee') {
        sessionStorage.setItem('adminAuthenticated', 'true')
        sessionStorage.removeItem('justExitedAdminMode') // Remove flag when entering admin mode
        // Auto-redirect admin/editor/committee to admin dashboard
        navigate('/admin/dashboard', { replace: true })
        return
      }
      
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
                  <option value="committee">{t('users.role.committee') || 'וועד'}</option>
                  <option value="editor">{t('users.role.editor') || 'עורך'}</option>
                  {/* Admin role is hidden - only system admin (admin/Panda123) exists */}
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
