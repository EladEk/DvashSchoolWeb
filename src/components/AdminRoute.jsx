import { Navigate } from 'react-router-dom'

const AdminRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true'

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  return children
}

export default AdminRoute
