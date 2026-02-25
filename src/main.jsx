import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TranslationProvider } from './contexts/TranslationContext'
import { AdminProvider } from './contexts/AdminContext'
import App from './App.jsx'
import './index.css'
import './components/Button.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <TranslationProvider>
        <AdminProvider>
          <App />
        </AdminProvider>
      </TranslationProvider>
    </ErrorBoundary>
  </StrictMode>,
)
