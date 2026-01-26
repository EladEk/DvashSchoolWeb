/**
 * Mock GitHub API for Local Testing
 * 
 * This file simulates the GitHub API for local development.
 * It saves to a local file instead of actually pushing to GitHub.
 * 
 * Usage: Copy this to api/publish-texts-local.js and use it for testing
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'content/texts.json'
    const commitMessage = req.body.commitMessage || 
      `[LOCAL TEST] Update site texts - ${new Date().toISOString()}`

    const filePath = path.join(process.cwd(), 'public', GITHUB_FILE_PATH)
    const contentPath = path.join(process.cwd(), GITHUB_FILE_PATH)

    let texts = req.body.texts

    if (!texts) {
      try {
        const admin = await import('firebase-admin')
        
        if (!admin.apps || admin.apps.length === 0) {
          const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : null

          if (serviceAccount) {
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount)
            })
          } else {
            throw new Error('Firebase not configured for local testing')
          }
        }

        const db = admin.firestore()
        const translationsRef = db.collection('translations')
        
        const [heDoc, enDoc] = await Promise.all([
          translationsRef.doc('he').get(),
          translationsRef.doc('en').get()
        ])

        texts = {
          he: heDoc.exists ? heDoc.data() : {},
          en: enDoc.exists ? enDoc.data() : {}
        }
      } catch (error) {
        try {
          const existing = fs.readFileSync(filePath, 'utf-8')
          texts = JSON.parse(existing)
        } catch {
          return res.status(400).json({ 
            error: 'No texts provided and Firebase not configured',
            hint: 'Either configure Firebase or pass texts in request body'
          })
        }
      }
    }

    // Exclude Parliament data
    const excludeParliament = (obj) => {
      if (!obj || typeof obj !== 'object') return obj
      if (Array.isArray(obj)) return obj.map(excludeParliament)
      
      const cleaned = {}
      for (const key in obj) {
        if (key.toLowerCase().includes('parliament')) {
          continue
        }
        if (obj[key] && typeof obj[key] === 'object') {
          cleaned[key] = excludeParliament(obj[key])
        } else {
          cleaned[key] = obj[key]
        }
      }
      return cleaned
    }

    const cleanedTexts = {
      he: excludeParliament(texts.he || {}),
      en: excludeParliament(texts.en || {})
    }

    // Format as JSON
    const jsonContent = JSON.stringify(cleanedTexts, null, 2)

    try {
      const publicDir = path.dirname(filePath)
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }

      const contentDir = path.dirname(contentPath)
      if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true })
      }

      fs.writeFileSync(filePath, jsonContent, 'utf-8')
      
      fs.writeFileSync(contentPath, jsonContent, 'utf-8')

      return res.status(200).json({
        success: true,
        message: 'Texts saved locally (TEST MODE)',
        commit: {
          sha: 'local-test-' + Date.now(),
          message: commitMessage,
          url: 'local-test-mode'
        },
        file: {
          path: GITHUB_FILE_PATH,
          sha: 'local-test',
          url: 'local-test-mode'
        },
        local: {
          publicPath: filePath,
          contentPath: contentPath
        }
      })
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to write file locally',
        message: error.message 
      })
    }

  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
