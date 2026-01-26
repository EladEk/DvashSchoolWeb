/**
 * Save JSON files locally (same as publish but without GitHub)
 * Saves to both content/texts.json and public/content/texts.json
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
    
    // Get texts from request body or fetch from Firebase
    let texts = req.body.texts

    if (!texts) {
      // Try to load from Firebase if not provided
      try {
        const admin = await import('firebase-admin')
        
        if (!admin.apps || admin.apps.length === 0) {
          const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, '\n'))
            : null

          if (serviceAccount) {
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: serviceAccount.project_id
            })
          } else {
            throw new Error('Firebase not configured')
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
        console.error('Firebase error:', error.message)
        return res.status(400).json({ 
          error: 'No texts provided and Firebase not configured',
          hint: 'Either configure Firebase or pass texts in request body'
        })
      }
    }

    // Exclude Parliament data (same as publish)
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

    // Fetch images from Firebase (same as publish)
    let images = {}
    try {
      const admin = await import('firebase-admin')
      if (admin.apps && admin.apps.length > 0) {
        const db = admin.firestore()
        const imagesRef = db.collection('images')
        const imagesSnapshot = await imagesRef.get()
        
        if (!imagesSnapshot.empty) {
          // Helper function to normalize image path
          const normalizeImagePath = (imagePathOrUrl) => {
            if (!imagePathOrUrl) return null
            
            let path = imagePathOrUrl
            
            if (path.startsWith('http')) {
              try {
                const url = new URL(path)
                path = url.pathname
              } catch {
                const match = path.match(/\/school-website\/.+$/)
                if (match) {
                  path = match[0]
                }
              }
            }
            
            if (path.includes('/school-website/')) {
              const match = path.match(/\/school-website\/.+$/)
              if (match) {
                path = match[0]
              }
            }
            
            return path || null
          }
          
          imagesSnapshot.forEach((doc) => {
            const data = doc.data()
            const imageKey = doc.id
            const imagePath = data.path || data.location || data.url || data.imageUrl || data.imagePath || null
            
            if (imagePath) {
              images[imageKey] = normalizeImagePath(imagePath)
            } else {
              images[imageKey] = null
            }
          })
        }
      }
    } catch (imagesError) {
      console.error('Error fetching images:', imagesError)
      // Continue without images
    }

    // Add images to the JSON structure
    const finalContent = {
      ...cleanedTexts,
      images: images
    }

    // Format as JSON
    const jsonContent = JSON.stringify(finalContent, null, 2)

    // Write to both locations (same as publish)
    const filePath = path.join(process.cwd(), 'public', GITHUB_FILE_PATH)
    const contentPath = path.join(process.cwd(), GITHUB_FILE_PATH)

    try {
      // Ensure directories exist
      const publicDir = path.dirname(filePath)
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }

      const contentDir = path.dirname(contentPath)
      if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true })
      }

      // Write to public/content/texts.json (for serving)
      fs.writeFileSync(filePath, jsonContent, 'utf-8')
      
      // Also write to content/texts.json (for git)
      fs.writeFileSync(contentPath, jsonContent, 'utf-8')

      return res.status(200).json({
        success: true,
        message: 'JSON files saved successfully',
        files: [
          { path: GITHUB_FILE_PATH },
          { path: `public/${GITHUB_FILE_PATH}` }
        ]
      })
    } catch (error) {
      console.error('File write error:', error)
      return res.status(500).json({ 
        error: 'Failed to write files',
        message: error.message 
      })
    }

  } catch (error) {
    console.error('Save JSON error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
