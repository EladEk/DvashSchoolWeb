import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAdmin } from './contexts/AdminContext'
import { useTranslation } from './contexts/TranslationContext'
import Header from './components/Header'
import OrganizationSchema from './components/OrganizationSchema'
import BreadcrumbSchema from './components/BreadcrumbSchema'
import Footer from './components/Footer'
import AdminIndicator from './components/AdminIndicator'
import Home from './pages/Home'
import FAQ from './pages/FAQ'
import ContactPage from './pages/ContactPage'
import ParentCommittee from './pages/ParentCommittee'
import ParentsAssociation from './pages/ParentsAssociation'
import AdminDashboard from './pages/AdminDashboard'
import Parliament from './pages/Parliament'
import ParliamentAdmin from './pages/ParliamentAdmin'
import ParliamentLogin from './pages/ParliamentLogin'
import Unauthorized from './pages/Unauthorized'
import AdminRoute from './components/AdminRoute'
import { RequireRole } from './utils/requireRole'
import { useScrollToHash } from './hooks/useScrollToHash'
import './App.css'
import './components/Loader.css'

function AppContent() {
  const { isAdminMode } = useAdmin()
  const { isLoading, t } = useTranslation()
  useScrollToHash() // Now this is inside Router context

  // Show loader while translations are loading
  if (isLoading) {
    return (
      <div className="app-loader">
        <img 
          src="/assets/LOGO.avif" 
          alt="בית ספר דב״ש"
          className="loader-logo"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
        <div className="loader-spinner"></div>
        <p>טוען...</p>
      </div>
    )
  }

  return (
    <div className={`App ${isAdminMode ? 'admin-mode' : ''}`}>
      <OrganizationSchema />
      <BreadcrumbSchema pathname={location.pathname} />
      <a href="#main-content" className="skip-link">
        {t('a11y.skipToMainContent')}
      </a>
      <AdminIndicator />
      <Header />
      <main id="main-content">
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/שאלות-תשובות" element={<FAQ />} />
        <Route path="/contact-8" element={<ContactPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/parent-committee" element={<ParentCommittee />} />
        <Route path="/parents-association" element={<ParentsAssociation />} />
        <Route path="/parliament" element={<Parliament />} />
        <Route path="/parliament/login" element={<ParliamentLogin />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/admin" element={<Navigate to="/parliament/login" replace />} />
        <Route path="/admin/" element={<Navigate to="/parliament/login" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute requireRole={['admin', 'editor']}>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/parliament"
          element={
            <RequireRole allowed={['admin', 'committee']}>
              <ParliamentAdmin />
            </RequireRole>
          }
        />
        <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}>Page not found</div>} />
      </Routes>
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
