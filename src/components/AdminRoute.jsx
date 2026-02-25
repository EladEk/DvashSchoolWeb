import { Navigate, useLocation } from 'react-router-dom'
import { useEffectiveRole, hasEditAccess, hasParliamentAdminAccess } from '../utils/requireRole'

const AdminRoute = ({ children, requireRole = null }) => {
  const location = useLocation()
  const { role, roles, phase } = useEffectiveRole()
  const session = (() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}') || {}
    } catch {
      return {}
    }
  })()
  const sessionRole = session?.role
  const effectiveRoles = roles.length ? roles : (session?.roles || (session?.role ? [session.role] : []))
  const canEnterAdmin = hasEditAccess(effectiveRoles) || hasParliamentAdminAccess(effectiveRoles)
  const hasAdminSession = sessionStorage.getItem('adminAuthenticated') === 'true' || canEnterAdmin
  const effectiveRole = role || session?.role
  const search = location.search || ''

  if (phase === 'checking' && !sessionRole) {
    return (
      <div className="admin-route-checking" style={{ textAlign: 'center', paddingTop: '20%', padding: '2rem', color: 'var(--text-color, #333)', minHeight: '40vh' }}>
        בודק הרשאות...
      </div>
    )
  }

  if (!hasAdminSession && phase !== 'checking') {
    return <Navigate to={`/parliament/login${search}`} replace />
  }

  if (requireRole && Array.isArray(requireRole) && (phase === 'allowed' || effectiveRoles.length)) {
    const normalized = effectiveRoles.map(r => String(r).trim().toLowerCase())
    const hasRequired = requireRole.some(r => normalized.includes(String(r).trim().toLowerCase()))
    if (!hasRequired) {
      return <Navigate to={`/unauthorized${search}`} replace />
    }
  }

  return children
}

export default AdminRoute
