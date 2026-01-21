// Role-based access control utilities
import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore'

export const UserRole = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  KIOSK: 'kiosk',
  PARENT: 'parent',
}

function normalizeRole(v) {
  if (typeof v !== 'string') return ''
  const r = v.trim().toLowerCase()
  const validRoles = ['admin', 'teacher', 'student', 'kiosk', 'parent']
  return validRoles.includes(r) ? r : ''
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('session') || 'null')
  } catch {
    return null
  }
}

async function roleFromCollection(coll, ident) {
  const { uid, email, usernameLower } = ident

  // 1) by doc id
  if (uid) {
    try {
      const s = await getDoc(doc(db, coll, uid))
      if (s.exists()) {
        const d = s.data()
        const role = normalizeRole(d?.role) || (coll === 'users' && d?.isAdmin ? 'admin' : '')
        if (role) return role
      }
    } catch {}
  }

  // 2) by uid field
  if (uid) {
    try {
      const q1 = query(collection(db, coll), where('uid', '==', uid), limit(1))
      const s1 = await getDocs(q1)
      if (!s1.empty) {
        const d = s1.docs[0].data()
        const role = normalizeRole(d?.role) || (coll === 'users' && d?.isAdmin ? 'admin' : '')
        if (role) return role
      }
    } catch {}
  }

  // 3) by email field
  if (email) {
    try {
      const q2 = query(collection(db, coll), where('email', '==', email), limit(1))
      const s2 = await getDocs(q2)
      if (!s2.empty) {
        const d = s2.docs[0].data()
        const role = normalizeRole(d?.role) || (coll === 'users' && d?.isAdmin ? 'admin' : '')
        if (role) return role
      }
    } catch {}
  }

  // 4) by usernameLower field
  if (usernameLower) {
    try {
      const q3 = query(collection(db, coll), where('usernameLower', '==', usernameLower), limit(1))
      const s3 = await getDocs(q3)
      if (!s3.empty) {
        const d = s3.docs[0].data()
        const role = normalizeRole(d?.role) || (coll === 'users' && d?.isAdmin ? 'admin' : '')
        if (role) return role
      }
    } catch {}
  }

  return ''
}

async function resolveRoleFromDB(ident) {
  const r1 = await roleFromCollection('appUsers', ident)
  if (r1) return r1
  return roleFromCollection('users', ident)
}

export function useEffectiveRole() {
  const [phase, setPhase] = useState('checking') // 'checking' | 'allowed' | 'denied' | 'none'
  const [role, setRole] = useState('')

  useEffect(() => {
    let alive = true

    const checkRole = async () => {
      try {
        const sess = getSession()
        const ident = {
          uid: sess?.uid || undefined,
          email: sess?.email || undefined,
          usernameLower: sess?.usernameLower || sess?.username ? String(sess.usernameLower || sess.username).toLowerCase() : undefined,
        }

        if (!ident.uid && !ident.email && !ident.usernameLower) {
          if (!alive) return
          setPhase('none')
          setRole('')
          return
        }

        const r = await resolveRoleFromDB(ident)
        if (!alive) return

        if (r) {
          setRole(r)
          setPhase('allowed')
        } else {
          setRole('')
          setPhase('denied')
        }
      } catch (e) {
        console.error('[useEffectiveRole] error:', e)
        if (!alive) return
        setRole('')
        setPhase('denied')
      }
    }

    checkRole()
    // Re-check when session changes
    const interval = setInterval(checkRole, 5000)

    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [])

  return { phase, role }
}

export const RequireRole = ({ allowed, children }) => {
  const { phase, role } = useEffectiveRole()

  if (phase === 'checking') {
    return <div style={{ color: '#fff', textAlign: 'center', paddingTop: '20%' }}>בודק הרשאות...</div>
  }
  if (phase === 'none') {
    return <Navigate to="/" replace />
  }
  if (phase === 'denied' || !role || !allowed.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return <>{children}</>
}

export function withRole(Component, allowed) {
  const Wrapped = (props) => {
    const { phase, role } = useEffectiveRole()

    if (phase === 'checking') {
      return <div style={{ color: '#fff', textAlign: 'center', paddingTop: '20%' }}>בודק הרשאות...</div>
    }
    if (phase === 'none') {
      return <Navigate to="/" replace />
    }
    if (phase === 'denied' || !role || !allowed.includes(role)) {
      return <Navigate to="/unauthorized" replace />
    }
    return <Component {...props} />
  }

  Wrapped.displayName = `withRole(${Component.displayName || Component.name || 'Component'})`
  return Wrapped
}
