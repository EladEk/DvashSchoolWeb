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
    // Get environment variables
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'EladEk'
    const GITHUB_REPO = process.env.GITHUB_REPO || 'DvashSchoolWeb'
    const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'content/texts.json'

    // Validate required environment variables
    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN environment variable is not set')
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'GITHUB_TOKEN is not set in environment variables'
      })
    }

    // Import Firebase Admin SDK (server-side only)
    let admin
    try {
      // Dynamic import for ES modules
      const adminModule = await import('firebase-admin')
      // firebase-admin exports as default, but also has named exports
      // Try default first, then the module itself
      admin = adminModule.default || adminModule
      
      // Verify admin object has required methods
      if (!admin || typeof admin.initializeApp !== 'function') {
        throw new Error('Firebase Admin module not loaded correctly')
      }
      
      if (!admin.credential || typeof admin.credential.cert !== 'function') {
        throw new Error('Firebase Admin credential API not available')
      }
      
      // Initialize Firebase Admin if not already initialized
      if (!admin.apps || admin.apps.length === 0) {
        // Check if environment variable exists
        const firebaseServiceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT
        
        if (!firebaseServiceAccountEnv) {
          console.error('FIREBASE_SERVICE_ACCOUNT is not set')
          // Debug: log available env vars (without sensitive data)
          const envKeys = Object.keys(process.env).filter(k => 
            k.includes('GITHUB') || k.includes('FIREBASE')
          )
          console.error('Available env vars:', envKeys)
          throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Please redeploy after adding the variable.')
        }

        let serviceAccount
        try {
          // Try to parse as JSON
          // Handle both string and already-parsed JSON
          if (typeof firebaseServiceAccountEnv === 'string') {
            serviceAccount = JSON.parse(firebaseServiceAccountEnv)
          } else {
            serviceAccount = firebaseServiceAccountEnv
          }
        } catch (parseError) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError.message)
          console.error('First 100 chars of env var:', firebaseServiceAccountEnv?.substring(0, 100))
          throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Make sure it\'s a single-line JSON string.')
        }

        if (!serviceAccount.type || serviceAccount.type !== 'service_account') {
          console.error('Service account missing type field. Keys:', Object.keys(serviceAccount))
          throw new Error('FIREBASE_SERVICE_ACCOUNT is missing required fields (type should be "service_account")')
        }

        if (!serviceAccount.private_key || !serviceAccount.client_email) {
          console.error('Service account missing required fields')
          throw new Error('FIREBASE_SERVICE_ACCOUNT is missing private_key or client_email')
        }

        // Fix private_key newlines - ensure \n characters are preserved correctly
        // Sometimes Vercel environment variables can mangle the newlines
        if (serviceAccount.private_key) {
          // Replace double-escaped newlines with single escaped
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n')
          // If there are actual newlines (which shouldn't happen in JSON), replace with \n
          if (serviceAccount.private_key.includes('\n') && !serviceAccount.private_key.includes('\\n')) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\n/g, '\\n')
          }
        }

        try {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          })
          console.log('Firebase Admin initialized successfully')
        } catch (initError) {
          console.error('Firebase Admin initialization failed:', initError.message)
          console.error('Service account project_id:', serviceAccount.project_id)
          console.error('Service account client_email:', serviceAccount.client_email)
          // Don't log private_key for security
          throw new Error(`Failed to initialize Firebase Admin: ${initError.message}. Check that FIREBASE_SERVICE_ACCOUNT JSON is correctly formatted with proper \\n in private_key.`)
        }
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', error)
      return res.status(500).json({ 
        error: 'Firebase configuration error',
        message: error.message,
        hint: error.message.includes('not set') 
          ? 'Make sure FIREBASE_SERVICE_ACCOUNT is set in Vercel and redeploy the project'
          : error.message.includes('Cannot find module')
          ? 'firebase-admin may not be installed. Check package.json and redeploy.'
          : 'Check that FIREBASE_SERVICE_ACCOUNT is valid JSON'
      })
    }

    // Fetch translations from Firebase
    let translations
    try {
      const db = admin.firestore()
      const translationsRef = db.collection('translations')
      
      const [heDoc, enDoc] = await Promise.all([
        translationsRef.doc('he').get(),
        translationsRef.doc('en').get()
      ])

      translations = {
        he: heDoc.exists ? heDoc.data() : {},
        en: enDoc.exists ? enDoc.data() : {}
      }
    } catch (error) {
      console.error('Error fetching from Firebase:', error)
      return res.status(500).json({ 
        error: 'Failed to fetch translations from Firebase',
        message: error.message
      })
    }

    // IMPORTANT: Exclude Parliament-related data
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

    // Determine GitHub API auth header (fine-grained tokens use Bearer, classic use token)
    const authHeader = GITHUB_TOKEN.startsWith('ghp_') 
      ? `token ${GITHUB_TOKEN}`
      : `Bearer ${GITHUB_TOKEN}`

    // Get the current file SHA (required for updating existing files)
    const getFileSha = async () => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
          {
            headers: {
              'Authorization': authHeader,
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
          console.error('GitHub API error getting SHA:', response.status, errorText)
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

    let fileSha
    try {
      fileSha = await getFileSha()
    } catch (error) {
      console.error('Failed to get file SHA:', error)
      return res.status(500).json({ 
        error: 'Failed to get file SHA from GitHub',
        message: error.message
      })
    }

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
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'SchoolWebsite-Publish'
        },
        body: JSON.stringify({
          message: commitMessage,
          content: contentBase64,
          sha: fileSha, // Required for updates, null for new files
          branch: 'main' // Change to 'master' if your default branch is master
        })
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      
      console.error('GitHub API update error:', updateResponse.status, errorData)
      return res.status(updateResponse.status).json({ 
        error: 'Failed to update GitHub file',
        status: updateResponse.status,
        details: errorData.message || errorText,
        hint: updateResponse.status === 401 ? 'Check GITHUB_TOKEN is valid' :
              updateResponse.status === 403 ? 'Check token has repo permissions' :
              updateResponse.status === 404 ? 'Check GITHUB_OWNER, GITHUB_REPO, and file path' :
              'Check GitHub API response for details'
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
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
