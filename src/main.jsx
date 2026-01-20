import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TranslationProvider } from './contexts/TranslationContext'
import { AdminProvider } from './contexts/AdminContext'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TranslationProvider>
      <AdminProvider>
        <App />
      </AdminProvider>
    </TranslationProvider>
  </StrictMode>,
)
