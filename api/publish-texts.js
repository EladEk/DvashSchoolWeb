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

        // Fix private_key newlines
        // When JSON has "\\n", JSON.parse() converts it to the literal string "\n" (backslash+n)
        // Firebase needs actual newline characters, not the literal string "\n"
        if (serviceAccount.private_key) {
          // Log diagnostic info (first 50 chars only for security)
          const keyPreview = serviceAccount.private_key.substring(0, 50)
          console.log('Private key preview (first 50 chars):', keyPreview)
          console.log('Private key contains \\n (literal):', serviceAccount.private_key.includes('\\n'))
          console.log('Private key contains actual newlines:', serviceAccount.private_key.includes('\n'))
          
          // Replace literal "\n" (backslash+n) with actual newline characters
          // This handles the case where Vercel stored "\\n" which parsed to "\n"
          const beforeLength = serviceAccount.private_key.length
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
          const afterLength = serviceAccount.private_key.length
          
          console.log('Private key length before/after newline fix:', beforeLength, '/', afterLength)
          console.log('Private key after fix contains actual newlines:', serviceAccount.private_key.includes('\n'))
          
          // Verify the key starts correctly
          if (!serviceAccount.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
            console.error('WARNING: Private key does not start with expected header')
          }
          if (!serviceAccount.private_key.includes('-----END PRIVATE KEY-----')) {
            console.error('WARNING: Private key does not contain expected footer')
          }
        }

        // Validate service account before initialization
        console.log('Service account project_id:', serviceAccount.project_id)
        console.log('Service account client_email:', serviceAccount.client_email)
        if (!serviceAccount.project_id) {
          throw new Error('Service account JSON is missing project_id field')
        }
        
        try {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id // Explicitly set project ID
          })
          
          // Verify initialization succeeded
          if (!admin.apps || admin.apps.length === 0) {
            throw new Error('Firebase Admin initialization returned no apps')
          }
          
          const app = admin.apps[0]
          const projectId = app.options?.projectId || app.options?.credential?.projectId || serviceAccount.project_id
          console.log('Firebase Admin initialized successfully')
          console.log('Firebase project ID:', projectId)
          console.log('Firebase app name:', app.name)
        } catch (initError) {
          console.error('Firebase Admin initialization failed:', initError.message)
          console.error('Init error stack:', initError.stack)
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
      // Verify Firebase Admin is properly initialized
      if (!admin.apps || admin.apps.length === 0) {
        throw new Error('Firebase Admin not initialized')
      }
      
      const app = admin.apps[0]
      const projectId = app.options?.projectId || app.options?.credential?.projectId || 'unknown'
      console.log('Firebase Admin initialized, project:', projectId)
      console.log('Firebase app options keys:', Object.keys(app.options || {}))
      
      // Verify we can get a Firestore instance
      let db
      try {
        // Get Firestore instance
        // Note: In serverless functions, Firestore might be reused across invocations
        // Don't call settings() - it can only be called once and will fail if already initialized
        // Settings are optional anyway, so we can skip them
        db = admin.firestore()
        console.log('Firestore instance created successfully')
      } catch (dbError) {
        console.error('Failed to create Firestore instance:', dbError.message)
        throw new Error(`Failed to create Firestore instance: ${dbError.message}`)
      }
      
      // Test connection by checking if we can access Firestore
      console.log('Attempting to fetch translations from Firestore...')
      if (admin.apps && admin.apps.length > 0) {
        console.log('Database project:', admin.apps[0].options?.projectId || 'unknown')
      }
      
      // Try a simple read operation first to test authentication
      try {
        const translationsRef = db.collection('translations')
        console.log('Collection reference created, attempting to read documents...')
        
        const [heDoc, enDoc] = await Promise.all([
          translationsRef.doc('he').get(),
          translationsRef.doc('en').get()
        ])

        console.log('Fetched translations - he exists:', heDoc.exists, 'en exists:', enDoc.exists)

        translations = {
          he: heDoc.exists ? heDoc.data() : {},
          en: enDoc.exists ? enDoc.data() : {}
        }
        
        // Log what keys are in the translations (for debugging)
        console.log('Translation keys in he:', Object.keys(translations.he || {}))
        console.log('Translation keys in en:', Object.keys(translations.en || {}))
        console.log('Has sections in he:', 'sections' in (translations.he || {}))
        console.log('Has sections in en:', 'sections' in (translations.en || {}))
        if (translations.he?.sections) {
          console.log('Sections count in he:', Array.isArray(translations.he.sections) ? translations.he.sections.length : 'not an array')
        }
        if (translations.en?.sections) {
          console.log('Sections count in en:', Array.isArray(translations.en.sections) ? translations.en.sections.length : 'not an array')
        }
      } catch (readError) {
        console.error('Error reading from Firestore collection:', readError)
        console.error('Read error code:', readError.code)
        console.error('Read error message:', readError.message)
        throw readError // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error('Error fetching from Firebase:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error stack:', error.stack)
      
      // Check if Firebase Admin was initialized
      const isInitialized = admin.apps && admin.apps.length > 0
      console.error('Firebase Admin initialized:', isInitialized)
      if (isInitialized) {
        console.error('Firebase project ID:', admin.apps[0].options?.projectId)
      }
      
      // Provide more specific error messages
      let errorMessage = error.message
      let hint = 'Verify the service account JSON is correct and has Firestore permissions enabled'
      
      if (error.code === 16 || error.message.includes('UNAUTHENTICATED')) {
        errorMessage = 'Firebase authentication failed. Check Vercel logs for details.'
        hint = 'Possible causes: 1) FIREBASE_SERVICE_ACCOUNT JSON format issue (check private_key newlines), 2) Missing IAM role "Firebase Admin SDK Administrator Service Agent", 3) Firestore API not enabled. See DEBUG_FIREBASE_AUTH.md for steps.'
      } else if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'Firebase permission denied. Service account needs Firestore read permissions.'
        hint = 'Grant the service account "Firebase Admin SDK Administrator Service Agent" role in Google Cloud Console IAM settings.'
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch translations from Firebase',
        message: errorMessage,
        code: error.code,
        hint: hint,
        // Always include error code for debugging
        errorCode: error.code,
        // Include more details in development
        ...(process.env.NODE_ENV === 'development' && {
          details: error.details,
          stack: error.stack,
          fullMessage: error.message
        })
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
    
    // Fetch images from Firebase and add to JSON
    console.log('Fetching images from Firebase...')
    let images = {}
    try {
      if (!db) {
        throw new Error('Firestore db instance is not available')
      }
      
      const imagesRef = db.collection('images')
      const imagesSnapshot = await imagesRef.get()
      
      imagesSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.path) {
          images[doc.id] = data.path
        }
      })
      console.log(`Fetched ${Object.keys(images).length} images from Firebase`)
    } catch (imagesError) {
      console.error('Error fetching images from Firebase:', imagesError)
      console.error('Images error details:', imagesError.message)
      // Continue without images - they'll be loaded from Firebase in production
      // Images will be empty object, which is fine
    }
    
    // Add images to the JSON structure
    const finalContent = {
      ...cleanedTranslations,
      images: images // Add images at root level for easy access
    }
    
    // Log what's being published (for debugging)
    console.log('Keys after Parliament exclusion in he:', Object.keys(cleanedTranslations.he || {}))
    console.log('Keys after Parliament exclusion in en:', Object.keys(cleanedTranslations.en || {}))
    console.log('Has sections after exclusion in he:', 'sections' in (cleanedTranslations.he || {}))
    console.log('Has sections after exclusion in en:', 'sections' in (cleanedTranslations.en || {}))
    console.log('Images count:', Object.keys(images).length)

    // Format as JSON string
    const jsonContent = JSON.stringify(finalContent, null, 2)
    
    // Log file size for debugging
    console.log('Generated JSON size:', jsonContent.length, 'bytes')

    // Determine GitHub API auth header (fine-grained tokens use Bearer, classic use token)
    const authHeader = GITHUB_TOKEN.startsWith('ghp_') 
      ? `token ${GITHUB_TOKEN}`
      : `Bearer ${GITHUB_TOKEN}`

    // Helper function to get file SHA
    const getFileSha = async (filePath) => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
          {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'SchoolWebsite-Publish'
            }
          }
        )

        if (response.status === 404) {
          return null // File doesn't exist yet
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`GitHub API error getting SHA for ${filePath}:`, response.status, errorText)
          throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        return data.sha
      } catch (error) {
        if (error.message.includes('404')) {
          return null
        }
        throw error
      }
    }

    // Helper function to update a file in GitHub
    const updateFile = async (filePath, sha) => {
      const contentBase64 = Buffer.from(jsonContent, 'utf-8').toString('base64')
      const commitMessage = req.body.commitMessage || 
        `Update site texts from Firebase - ${new Date().toISOString()}`

      const updateResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
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
            sha: sha, // Required for updates, null for new files
            branch: 'main'
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
        throw new Error(`Failed to update ${filePath}: ${errorData.message || errorText}`)
      }

      return await updateResponse.json()
    }

    // Update both files: content/texts.json (version control) and public/content/texts.json (served by Vite)
    const filePaths = [
      GITHUB_FILE_PATH,  // content/texts.json (version control)
      'public/content/texts.json'  // public/content/texts.json (served by Vite)
    ]

    const results = []
    const errors = []

    for (const filePath of filePaths) {
      try {
        console.log(`Updating ${filePath}...`)
        const sha = await getFileSha(filePath)
        const updateData = await updateFile(filePath, sha)
        results.push({
          path: filePath,
          sha: updateData.content.sha,
          url: updateData.content.html_url
        })
        console.log(`Successfully updated ${filePath}`)
      } catch (error) {
        console.error(`Error updating ${filePath}:`, error)
        errors.push({ path: filePath, error: error.message })
      }
    }

    // If all updates failed, return error
    if (results.length === 0) {
      return res.status(500).json({
        error: 'Failed to update GitHub files',
        errors: errors,
        hint: 'Check GITHUB_TOKEN permissions and file paths'
      })
    }

    // If some succeeded, return success with warnings
    const commitMessage = req.body.commitMessage || 
      `Update site texts from Firebase - ${new Date().toISOString()}`

    return res.status(200).json({
      success: true,
      message: `Texts published successfully (${results.length}/${filePaths.length} files updated)`,
      files: results,
      ...(errors.length > 0 && {
        warnings: errors,
        message: `Texts published with warnings. ${results.length} files updated, ${errors.length} failed.`
      })
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
