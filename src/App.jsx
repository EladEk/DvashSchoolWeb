import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAdmin } from './contexts/AdminContext'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminIndicator from './components/AdminIndicator'
import Home from './pages/Home'
import FAQ from './pages/FAQ'
import ContactPage from './pages/ContactPage'
import ParentCommittee from './pages/ParentCommittee'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminRoute from './components/AdminRoute'
import { useScrollToHash } from './hooks/useScrollToHash'
import './App.css'

function AppContent() {
  const { isAdminMode } = useAdmin()
  useScrollToHash() // Now this is inside Router context

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
