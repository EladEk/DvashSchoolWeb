import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAdmin } from './contexts/AdminContext'
import { useTranslation } from './contexts/TranslationContext'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminIndicator from './components/AdminIndicator'
import Home from './pages/Home'
import FAQ from './pages/FAQ'
import ContactPage from './pages/ContactPage'
import ParentCommittee from './pages/ParentCommittee'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import Parliament from './pages/Parliament'
import ParliamentAdmin from './pages/ParliamentAdmin'
import ParliamentLogin from './pages/ParliamentLogin'
import AdminRoute from './components/AdminRoute'
import { RequireRole } from './utils/requireRole'
import { useScrollToHash } from './hooks/useScrollToHash'
import './App.css'

function AppContent() {
  const { isAdminMode } = useAdmin()
  const { isLoading } = useTranslation()
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
      <AdminIndicator />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/שאלות-תשובות" element={<FAQ />} />
        <Route path="/contact-8" element={<ContactPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/parent-committee" element={<ParentCommittee />} />
        <Route path="/parliament" element={<Parliament />} />
        <Route path="/parliament/login" element={<ParliamentLogin />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/parliament"
          element={
            <RequireRole allowed={['admin']}>
              <ParliamentAdmin />
            </RequireRole>
          }
        />
        <Route path="*" element={<div style={{ padding: '2rem', textAlign: 'center' }}>Page not found</div>} />
      </Routes>
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
