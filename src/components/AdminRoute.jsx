import { Navigate } from 'react-router-dom'
import { useEffectiveRole } from '../utils/requireRole'

const AdminRoute = ({ children, requireRole = null }) => {
  const { role, phase } = useEffectiveRole()
  
  // Check if user has admin session
  const session = (() => {
    try {
      return JSON.parse(localStorage.getItem('session') || '{}') || {}
    } catch {
      return {}
    }
  })()
  
  const sessionRole = session?.role || ''
  const effectiveRole = role || sessionRole
  
  const isAdminRole = effectiveRole === 'admin' || effectiveRole === 'editor' || effectiveRole === 'committee'
  const hasAdminSession = sessionStorage.getItem('adminAuthenticated') === 'true' || isAdminRole

  if (phase === 'checking' && !sessionRole) {
    return <div style={{ color: '#fff', textAlign: 'center', paddingTop: '20%' }}>בודק הרשאות...</div>
  }

  if (!hasAdminSession && phase !== 'checking') {
    return <Navigate to="/parliament/login" replace />
  }

  // If specific role is required, check it
  if (requireRole && (phase === 'allowed' || sessionRole)) {
    if (!effectiveRole || !requireRole.includes(effectiveRole)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}

export default AdminRoute
