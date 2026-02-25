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

function parseServiceAccount(raw) {
  if (!raw || typeof raw !== 'string') return null
  // Strip BOM and trim
  let trimmed = raw.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return null

  // Fix: if private_key contains real newlines (invalid JSON), escape them as \n
  trimmed = trimmed.replace(/"private_key"\s*:\s*"([\s\S]*?)"/g, (_, keyContent) =>
    '"private_key": "' + keyContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\\n') + '"'
  )
  // Fix: smart/curly quotes from paste
  trimmed = trimmed.replace(/\u201C|\u201D/g, '"').replace(/\u2018|\u2019/g, "'")

  // Parse as-is: private_key may contain \n (two chars); do NOT replace \\n in the whole string here or JSON becomes invalid. We normalize private_key after parse in ensureFirebaseAdmin.

  // Try direct JSON parse
  try {
    return JSON.parse(trimmed)
  } catch (_) {}

  // Try base64 (common when pasting multi-line JSON into Vercel)
  try {
    const decoded = Buffer.from(raw.replace(/^\uFEFF/, '').trim(), 'base64').toString('utf8')
    const fixed = decoded.replace(/"private_key"\s*:\s*"([\s\S]*?)"/g, (_, keyContent) =>
      '"private_key": "' + keyContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\\n') + '"'
    )
    const parsed = JSON.parse(fixed)
    if (parsed && (parsed.private_key || parsed.client_email)) return parsed
  } catch (_) {}

  return null
}

async function ensureFirebaseAdmin(admin) {
  if (admin.apps && admin.apps.length > 0) {
    return admin.apps[0]
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set. In Vercel: Project Settings → Environment Variables → add FIREBASE_SERVICE_ACCOUNT with the full Firebase service account JSON (single line, use \\n for newlines in private_key).')
  }
  const serviceAccount = parseServiceAccount(raw)
  if (!serviceAccount) {
    const hint = raw.trim().length < 100
      ? ' Value may be truncated (Vercel often saves only one line). Paste the entire JSON as a single line in the env value.'
      : ' Paste as one line with \\n for newlines in private_key, or base64-encode the JSON.'
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.' + hint)
  }
  if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing required fields (private_key, client_email, project_id)')
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
