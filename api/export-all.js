/**
 * Export all data: Git content (content/texts.json) + all Firestore collections.
 * Returns one JSON for download. No file system write (safe for Vercel).
 */

function serializeForJson(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString()
  if (typeof obj.toMillis === 'function') return obj.toMillis()
  if (Array.isArray(obj)) return obj.map(serializeForJson)
  if (obj && typeof obj === 'object' && obj.constructor?.name === 'Timestamp') {
    return obj.toDate ? obj.toDate().toISOString() : obj.toMillis()
  }
  if (obj && typeof obj === 'object') {
    const out = {}
    for (const k of Object.keys(obj)) out[k] = serializeForJson(obj[k])
    return out
  }
  return obj
}

async function ensureFirebase() {
  const admin = await import('firebase-admin')
  if (!admin.apps || admin.apps.length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, '\n'))
      : null
    if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id })
  }
  return admin.firestore()
}

async function fetchGitTexts(siteUrl) {
  const base = siteUrl || process.env.VITE_SITE_URL || `https://${process.env.VERCEL_URL || 'dvashschool.vercel.app'}`
  const url = `${base.startsWith('http') ? base : `https://${base}`}/content/texts.json?t=${Date.now()}`
  try {
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error('Fetch git texts:', e.message)
    return null
  }
}

async function getAllDocs(db, collectionId, orderByField = null) {
  const col = db.collection(collectionId)
  const snapshot = orderByField
    ? await col.orderBy(orderByField).get()
    : await col.get()
  return snapshot.docs.map((d) => ({ id: d.id, ...serializeForJson(d.data()) }))
}

async function getTranslationsDocs(db) {
  const he = await db.collection('translations').doc('he').get()
  const en = await db.collection('translations').doc('en').get()
  return {
    he: he.exists ? serializeForJson(he.data()) : {},
    en: en.exists ? serializeForJson(en.data()) : {}
  }
}

async function getImagesDoc(db) {
  const snap = await db.collection('images').get()
  const out = {}
  snap.docs.forEach((d) => {
    const data = d.data()
    out[d.id] = data.path ?? data.location ?? data.url ?? data.imageUrl ?? data.imagePath ?? null
  })
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const siteUrl = req.body?.siteUrl || req.query?.siteUrl || process.env.VITE_SITE_URL || null

    let gitTexts = null
    try {
      gitTexts = await fetchGitTexts(siteUrl)
    } catch (e) {
      console.error('Git texts fetch:', e.message)
    }

    let db = null
    let dbData = {}
    try {
      db = await ensureFirebase()
      const [
        translations,
        images,
        contacts,
        parliamentDates,
        parliamentSubjects,
        parliamentNotes,
        parliamentHistory,
        appUsers
      ] = await Promise.all([
        getTranslationsDocs(db),
        getImagesDoc(db),
        getAllDocs(db, 'contacts'),
        getAllDocs(db, 'parliamentDates', 'date'),
        getAllDocs(db, 'parliamentSubjects'),
        getAllDocs(db, 'parliamentNotes'),
        getAllDocs(db, 'parliamentHistory', 'archivedAt'),
        getAllDocs(db, 'appUsers', 'usernameLower')
      ])
      dbData = {
        translations,
        images,
        contacts,
        parliamentDates,
        parliamentSubjects,
        parliamentNotes,
        parliamentHistory,
        appUsers
      }
    } catch (dbError) {
      console.error('DB export error:', dbError.message)
      dbData = { error: dbError.message }
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      git: gitTexts,
      db: dbData
    }

    const jsonContent = JSON.stringify(payload, null, 2)

    return res.status(200).json({
      success: true,
      message: 'Export includes Git content + all DB tables.',
      download: true,
      jsonContent
    })
  } catch (error) {
    console.error('Export error:', error)
    return res.status(500).json({
      error: 'Export failed',
      message: error.message
    })
  }
}
