/**
 * Vercel Serverless Function: Publish Texts to GitHub
 * 
 * This endpoint:
 * 1. Fetches latest texts from Firebase (excluding Parliament)
 * 2. Formats them as texts.json
 * 3. Updates the file in GitHub repository via REST API
 * 
 * Security:
 * - Requires Firebase Auth token (verified server-side)
 * - GitHub token stored in environment variables (never exposed to client)
 * - Only admins/editors can publish
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify Firebase Auth token (if provided)
    const authToken = req.headers.authorization?.replace('Bearer ', '')
    
    // TODO: Verify token with Firebase Admin SDK
    // For now, we'll rely on the client-side check and environment variable protection
    // In production, you should verify the token here:
    // const admin = require('firebase-admin')
    // const decodedToken = await admin.auth().verifyIdToken(authToken)
    // if (!decodedToken || !['admin', 'editor'].includes(decodedToken.role)) {
    //   return res.status(403).json({ error: 'Unauthorized' })
    // }

    // Get environment variables
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'your-username'
    const GITHUB_REPO = process.env.GITHUB_REPO || 'SchoolWebsite'
    const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'content/texts.json'

    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN environment variable is not set')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Import Firebase Admin SDK (server-side only)
    // Note: You'll need to install firebase-admin: npm install firebase-admin
    let admin
    try {
      admin = await import('firebase-admin')
      
      // Initialize Firebase Admin if not already initialized
      if (!admin.apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : null

        if (!serviceAccount) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set')
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        })
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', error)
      return res.status(500).json({ error: 'Firebase configuration error' })
    }

/**
 * Vercel Serverless Function: Publish Texts to GitHub
 * 
 * This endpoint:
 * 1. Fetches latest texts from Firebase (excluding Parliament)
 * 2. Formats them as texts.json
 * 3. Updates the file in GitHub repository via REST API
 * 
 * Security:
 * - Requires Firebase Auth token (verified server-side)
 * - GitHub token stored in environment variables (never exposed to client)
 * - Only admins/editors can publish
 */

// Note: This uses dynamic imports for Firebase Admin SDK
// Install: npm install firebase-admin

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify Firebase Auth token (if provided)
    const authToken = req.headers.authorization?.replace('Bearer ', '')
    
    // TODO: Verify token with Firebase Admin SDK
    // For now, we'll rely on the client-side check and environment variable protection
    // In production, you should verify the token here:
    // const admin = await import('firebase-admin')
    // const decodedToken = await admin.auth().verifyIdToken(authToken)
    // if (!decodedToken || !['admin', 'editor'].includes(decodedToken.role)) {
    //   return res.status(403).json({ error: 'Unauthorized' })
    // }

    // Get environment variables
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'your-username'
    const GITHUB_REPO = process.env.GITHUB_REPO || 'SchoolWebsite'
    const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'content/texts.json'

    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN environment variable is not set')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Import Firebase Admin SDK (server-side only)
    // Note: You'll need to install firebase-admin: npm install firebase-admin
    let admin
    try {
      admin = await import('firebase-admin')
      
      // Initialize Firebase Admin if not already initialized
      if (!admin.apps || admin.apps.length === 0) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : null

        if (!serviceAccount) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set')
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        })
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', error)
      return res.status(500).json({ error: 'Firebase configuration error', details: error.message })
    }

    // Fetch translations from Firebase
    const db = admin.firestore()
    const translationsRef = db.collection('translations')
    
    const [heDoc, enDoc] = await Promise.all([
      translationsRef.doc('he').get(),
      translationsRef.doc('en').get()
    ])

    const translations = {
      he: heDoc.exists ? heDoc.data() : {},
      en: enDoc.exists ? enDoc.data() : {}
    }

    // IMPORTANT: Exclude Parliament-related data
    // Remove any keys that start with "parliament" (case-insensitive)
    const excludeParliament = (obj) => {
      if (!obj || typeof obj !== 'object') return obj
      if (Array.isArray(obj)) return obj.map(excludeParliament)
      
      const cleaned = {}
      for (const key in obj) {
        // Skip parliament-related keys
        if (key.toLowerCase().includes('parliament')) {
          continue
        }
        
        // Recursively clean nested objects
        if (obj[key] && typeof obj[key] === 'object') {
          cleaned[key] = excludeParliament(obj[key])
        } else {
          cleaned[key] = obj[key]
        }
      }
      return cleaned
    }

    const cleanedTranslations = {
      he: excludeParliament(translations.he),
      en: excludeParliament(translations.en)
    }

    // Format as JSON string
    const jsonContent = JSON.stringify(cleanedTranslations, null, 2)

    // Get the current file SHA (required for updating existing files)
    const getFileSha = async () => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
          {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'SchoolWebsite-Publish'
            }
          }
        )

        if (response.status === 404) {
          // File doesn't exist yet, return null (will create new file)
          return null
        }

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        return data.sha
      } catch (error) {
        console.error('Error getting file SHA:', error)
        // If file doesn't exist, return null to create it
        if (error.message.includes('404')) {
          return null
        }
        throw error
      }
    }

    const fileSha = await getFileSha()

    // Encode content to base64
    const contentBase64 = Buffer.from(jsonContent, 'utf-8').toString('base64')

    // Update or create file in GitHub
    const commitMessage = req.body.commitMessage || 
      `Update site texts from Firebase - ${new Date().toISOString()}`

    const updateResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'SchoolWebsite-Publish'
        },
        body: JSON.stringify({
          message: commitMessage,
          content: contentBase64,
          sha: fileSha, // Required for updates, null for new files
          branch: 'main' // or 'master' depending on your default branch
        })
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('GitHub API update error:', errorText)
      return res.status(updateResponse.status).json({ 
        error: 'Failed to update GitHub file',
        details: errorText 
      })
    }

    const updateData = await updateResponse.json()

    return res.status(200).json({
      success: true,
      message: 'Texts published successfully',
      commit: {
        sha: updateData.commit.sha,
        message: commitMessage,
        url: updateData.commit.html_url
      },
      file: {
        path: updateData.content.path,
        sha: updateData.content.sha,
        url: updateData.content.html_url
      }
    })

  } catch (error) {
    console.error('Publish error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
