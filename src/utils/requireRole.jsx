// Role-based access control utilities
import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { resolveUserRoles } from '../services/firebaseDB'

export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EDITOR: 'editor',
  COMMITTEE: 'committee',
  PARENT: 'parent',
  STUDENT: 'student',
}

/** Roles that can enter edit mode (site content: translations, images) */
export const EDIT_CAPABLE_ROLES = ['admin', 'manager', 'editor']

/** Roles that can access parliament admin (dates, approve/delete subjects) */
export const PARLIAMENT_ADMIN_ROLES = ['admin', 'manager', 'committee']

/** Roles that can manage users (only admin/manager) */
export const USER_MANAGER_ROLES = ['admin', 'manager']

function normalizeRoles(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map(r => String(r).trim().toLowerCase()).filter(Boolean)
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('session') || 'null')
  } catch {
    return null
  }
}

/** Primary role for display (highest permission) */
function primaryRole(roles) {
  const r = normalizeRoles(roles)
  if (r.includes('admin') || r.includes('manager')) return 'admin'
  if (r.includes('editor')) return 'editor'
  if (r.includes('committee')) return 'committee'
  if (r.includes('parent')) return 'parent'
  if (r.includes('student')) return 'student'
  return r[0] || ''
}

/** Can edit website (translations, images) */
export function hasEditAccess(roles) {
  const r = normalizeRoles(roles)
  return r.some(x => ['admin', 'manager', 'editor'].includes(x))
}

/** Can do parliament admin (open dates, approve/delete subjects) */
export function hasParliamentAdminAccess(roles) {
  const r = normalizeRoles(roles)
  return r.some(x => ['admin', 'manager', 'committee'].includes(x))
}

/** Can manage users */
export function hasUserManagementAccess(roles) {
  const r = normalizeRoles(roles)
  return r.some(x => ['admin', 'manager'].includes(x))
}

/** Can suggest/reply to parliament (student/parent) */
export function canSuggestParliament(roles) {
  const r = normalizeRoles(roles)
  return r.some(x => ['student', 'parent'].includes(x))
}

export function useEffectiveRole() {
  const [phase, setPhase] = useState('checking')
  const [role, setRole] = useState('')
  const [roles, setRoles] = useState([])

  useEffect(() => {
    let alive = true

    const checkRole = async () => {
      try {
        const sess = getSession()
        if (sess?.mode === 'system-admin' || sess?.uid === 'system-admin') {
          if (!alive) return
          setRoles(['admin'])
          setRole('admin')
          setPhase('allowed')
          return
        }
        const sessionRoles = normalizeRoles(sess?.roles || (sess?.role ? [sess.role] : []))
        if (sessionRoles.length) {
          if (!alive) return
          setRoles(sessionRoles)
          setRole(primaryRole(sessionRoles))
          setPhase('allowed')
        }
        const ident = {
          uid: sess?.uid,
          email: sess?.email,
          usernameLower: sess?.usernameLower || (sess?.username ? String(sess.username).toLowerCase() : undefined),
        }
        if (!ident.uid && !ident.email && !ident.usernameLower) {
          if (!alive) return
          setPhase('none')
          setRole('')
          setRoles([])
          return
        }
        const dbRoles = await resolveUserRoles(ident)
        if (!alive) return
        if (dbRoles.length) {
          setRoles(dbRoles)
          setRole(primaryRole(dbRoles))
          setPhase('allowed')
        } else if (!sessionRoles.length) {
          setRole('')
          setRoles([])
          setPhase('denied')
        }
      } catch (e) {
        console.error('[useEffectiveRole] error:', e)
        if (!alive) return
        const sess = getSession()
        const sessionRoles = normalizeRoles(sess?.roles || (sess?.role ? [sess.role] : []))
        if (sessionRoles.length) {
          setRoles(sessionRoles)
          setRole(primaryRole(sessionRoles))
          setPhase('allowed')
        } else {
          setRole('')
          setRoles([])
          setPhase('denied')
        }
      }
    }

    checkRole()
    const interval = setInterval(checkRole, 5000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [])

  return { phase, role, roles }
}

export const RequireRole = ({ allowed, children }) => {
  const location = useLocation()
  const { phase, roles } = useEffectiveRole()
  const hasAllowed = Array.isArray(allowed) && allowed.length && roles.some(r => allowed.includes(r))
  const search = location.search || ''

  if (phase === 'checking') {
    return (
      <div className="require-role-checking" style={{ textAlign: 'center', paddingTop: '20%', padding: '2rem', color: 'var(--text-color, #333)', minHeight: '40vh' }}>
        בודק הרשאות...
      </div>
    )
  }
  if (phase === 'none') {
    return <Navigate to={search ? `/${search}` : '/'} replace />
  }
  if (phase === 'denied' || !hasAllowed) {
    return <Navigate to={`/unauthorized${search}`} replace />
  }
  return <>{children}</>
}

export function withRole(Component, allowed) {
  const Wrapped = (props) => {
    const { phase, roles } = useEffectiveRole()
    const hasAllowed = Array.isArray(allowed) && roles.some(r => allowed.includes(r))

    if (phase === 'checking') {
      return (
        <div className="require-role-checking" style={{ textAlign: 'center', paddingTop: '20%', padding: '2rem', color: 'var(--text-color, #333)', minHeight: '40vh' }}>
          בודק הרשאות...
        </div>
      )
    }
    if (phase === 'none') {
      return <Navigate to="/" replace />
    }
    if (phase === 'denied' || !hasAllowed) {
      return <Navigate to="/unauthorized" replace />
    }
    return <Component {...props} />
  }

  Wrapped.displayName = `withRole(${Component.displayName || Component.name || 'Component'})`
  return Wrapped
}
