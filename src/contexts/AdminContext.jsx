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
    
    // Also listen to storage events (for cross-tab updates)
    const handleStorageChange = () => {
      checkAuth()
    }
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const toggleAdminMode = () => {
    const newValue = !isAdminMode
    if (newValue) {
      sessionStorage.setItem('adminAuthenticated', 'true')
    } else {
      sessionStorage.removeItem('adminAuthenticated')
    }
    setIsAdminMode(newValue)
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
