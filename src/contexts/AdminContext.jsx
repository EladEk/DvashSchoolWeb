import { createContext, useContext, useState, useEffect } from 'react'

const AdminContext = createContext()

export const AdminProvider = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState(() => {
    // Check if admin is authenticated
    return sessionStorage.getItem('adminAuthenticated') === 'true'
  })

  useEffect(() => {
    // Update admin mode when authentication changes
    const checkAuth = () => {
      setIsAdminMode(sessionStorage.getItem('adminAuthenticated') === 'true')
    }
    
    // Check periodically
    const interval = setInterval(checkAuth, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const toggleAdminMode = () => {
    setIsAdminMode(!isAdminMode)
  }

  return (
    <AdminContext.Provider value={{ isAdminMode, toggleAdminMode }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
