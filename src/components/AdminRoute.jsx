import { Navigate } from 'react-router-dom'
import { useEffectiveRole, hasEditAccess, hasParliamentAdminAccess } from '../utils/requireRole'

const AdminRoute = ({ children, requireRole = null }) => {
  const { role, roles, phase } = useEffectiveRole()
  const session = (() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}') || {}
    } catch {
      return {}
    }
  })()
  const effectiveRoles = roles.length ? roles : (session?.roles || (session?.role ? [session.role] : []))
  const canEnterAdmin = hasEditAccess(effectiveRoles) || hasParliamentAdminAccess(effectiveRoles)
  const hasAdminSession = sessionStorage.getItem('adminAuthenticated') === 'true' || canEnterAdmin
  const effectiveRole = role || session?.role

  if (phase === 'checking' && !sessionRole) {
    return <div style={{ color: '#fff', textAlign: 'center', paddingTop: '20%' }}>בודק הרשאות...</div>
  }

  if (!hasAdminSession && phase !== 'checking') {
    return <Navigate to="/parliament/login" replace />
  }

  if (requireRole && Array.isArray(requireRole) && (phase === 'allowed' || effectiveRoles.length)) {
    const normalized = effectiveRoles.map(r => String(r).trim().toLowerCase())
    const hasRequired = requireRole.some(r => normalized.includes(String(r).trim().toLowerCase()))
    if (!hasRequired) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}

export default AdminRoute
