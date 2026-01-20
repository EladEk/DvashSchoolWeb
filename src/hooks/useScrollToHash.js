import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const useScrollToHash = () => {
  const location = useLocation()

  useEffect(() => {
    // Handle hash navigation on page load
    if (location.hash) {
      setTimeout(() => {
        const element = document.querySelector(location.hash)
        if (element) {
          const header = document.querySelector('.header')
          const adminToolbar = document.querySelector('.admin-toolbar')
          const headerHeight = header ? header.offsetHeight : 0
          const adminToolbarHeight = adminToolbar ? adminToolbar.offsetHeight : 0
          const offset = headerHeight + adminToolbarHeight + 20
          
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
          const offsetPosition = elementPosition - offset

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
  }, [location.hash])
}
