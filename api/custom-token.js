/**
 * Issue a Firebase custom token so the client can sign in and satisfy
 * Firestore rules that require request.auth != null for writes.
 *
 * Validates credentials (appUsers or system admin) and returns a token
 * the client uses with signInWithCustomToken(auth, token).
 *
 * Deploy with Vercel; ensure FIREBASE_SERVICE_ACCOUNT and optionally
 * ADMIN_PASSWORD (for system admin) are set.
 */

import crypto from 'crypto'

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

function getAdmin() {
  return import('firebase-admin').then((m) => m.default || m)
}

async function ensureFirebaseAdmin(admin) {
  if (admin.apps && admin.apps.length > 0) {
    return admin.apps[0]
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
  }
  let serviceAccount
  try {
    serviceAccount = typeof raw === 'string' ? JSON.parse(raw.replace(/\\n/g, '\n')) : raw
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON')
  }
  if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing required fields')
  }
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })
  return admin.apps[0]
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { username, password } = req.body || {}
    const usernameNorm = (username || '').trim()
    const passwordNorm = (password || '').trim()
    const usernameLower = usernameNorm.toLowerCase()

    if (!usernameNorm || !passwordNorm) {
      return res.status(400).json({ error: 'username and password are required' })
    }

    const admin = await getAdmin()
    await ensureFirebaseAdmin(admin)
    const db = admin.firestore()
    const auth = admin.auth()

    // System admin (optional): env ADMIN_PASSWORD or fallback for dev
    const adminPassword = process.env.ADMIN_PASSWORD || 'Panda123'
    if (usernameLower === 'admin' && passwordNorm === adminPassword) {
      const token = await auth.createCustomToken('system-admin', { role: 'admin' })
      return res.status(200).json({ token })
    }

    // App user: find by usernameLower and verify password hash
    const snap = await db.collection('appUsers').where('usernameLower', '==', usernameLower).limit(1).get()
    if (snap.empty) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }
    const doc = snap.docs[0]
    const data = doc.data()
    const passwordHash = sha256Hex(passwordNorm)
    if (data.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const uid = doc.id
    const claims = { role: data.role || 'student' }
    const token = await auth.createCustomToken(uid, claims)
    return res.status(200).json({ token })
  } catch (err) {
    console.error('[custom-token]', err)
    const code = err.message && err.message.includes('not set') ? 500 : 500
    return res.status(code).json({
      error: 'Failed to issue token',
      message: err.message || String(err),
    })
  }
}
