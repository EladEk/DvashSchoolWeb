#!/usr/bin/env node
/**
 * Deletes parliament test data (dates and subjects whose title starts with "E2E ").
 * Uses Firebase Admin; requires FIREBASE_SERVICE_ACCOUNT env (or GOOGLE_APPLICATION_CREDENTIALS).
 * Outputs one JSON line to stdout: { deletedDates, deletedSubjects, deletedNotes } or { error }.
 */
import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const E2E_PREFIX = 'E2E '
const E2E_END = E2E_PREFIX + '\uf8ff'

function parseServiceAccount(raw) {
  if (!raw || typeof raw !== 'string') return null
  let trimmed = raw.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return null
  trimmed = trimmed.replace(/"private_key"\s*:\s*"([\s\S]*?)"/g, (_, keyContent) =>
    '"private_key": "' + keyContent.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n') + '"'
  )
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
    return parsed
  } catch {
    return null
  }
}

function getApp() {
  if (admin.apps && admin.apps.length > 0) return admin.apps[0]
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    const cred = parseServiceAccount(raw)
    if (cred && cred.private_key && cred.client_email && cred.project_id) {
      admin.initializeApp({
        credential: admin.credential.cert(cred),
        projectId: cred.project_id,
      })
      return admin.apps[0]
    }
  }
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (keyPath) {
    const abs = resolve(process.cwd(), keyPath)
    const cred = JSON.parse(readFileSync(abs, 'utf8'))
    admin.initializeApp({ credential: admin.credential.cert(cred) })
    return admin.apps[0]
  }
  return null
}

async function main() {
  const app = getApp()
  if (!app) {
    const out = { error: 'FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS required' }
    console.log(JSON.stringify(out))
    process.exit(1)
  }
  const db = app.firestore()
  let deletedNotes = 0
  let deletedSubjects = 0
  let deletedDates = 0

  const subjectsSnap = await db.collection('parliamentSubjects')
    .where('title', '>=', E2E_PREFIX)
    .where('title', '<=', E2E_END)
    .get()

  for (const doc of subjectsSnap.docs) {
    const notesSnap = await db.collection('parliamentNotes').where('subjectId', '==', doc.id).get()
    for (const note of notesSnap.docs) {
      await note.ref.delete()
      deletedNotes++
    }
    await doc.ref.delete()
    deletedSubjects++
  }

  const datesSnap = await db.collection('parliamentDates')
    .where('title', '>=', E2E_PREFIX)
    .where('title', '<=', E2E_END)
    .get()

  for (const doc of datesSnap.docs) {
    await doc.ref.delete()
    deletedDates++
  }

  console.log(JSON.stringify({ deletedDates, deletedSubjects, deletedNotes }))
}

main().catch((err) => {
  console.log(JSON.stringify({ error: err.message || String(err) }))
  process.exit(1)
})
