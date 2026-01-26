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

  // Prevent duplicate requests - check if this is a duplicate call
  // Note: In serverless functions, each invocation is separate, so we can't track state
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
          // Replace literal "\n" (backslash+n) with actual newline characters
          // This handles the case where Vercel stored "\\n" which parsed to "\n"
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
          
          // Verify the key starts correctly
          if (!serviceAccount.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
            console.error('WARNING: Private key does not start with expected header')
          }
          if (!serviceAccount.private_key.includes('-----END PRIVATE KEY-----')) {
            console.error('WARNING: Private key does not contain expected footer')
          }
        }

        // Validate service account before initialization
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
    // IMPORTANT: Declare db outside try block so it's accessible for image fetching later
    let db = null
    let translations
    try {
      // Verify Firebase Admin is properly initialized
      if (!admin.apps || admin.apps.length === 0) {
        throw new Error('Firebase Admin not initialized')
      }
      
      const app = admin.apps[0]
      const projectId = app.options?.projectId || app.options?.credential?.projectId || 'unknown'
      
      // Verify we can get a Firestore instance
      try {
        // Get Firestore instance
        // Note: In serverless functions, Firestore might be reused across invocations
        // Don't call settings() - it can only be called once and will fail if already initialized
        // Settings are optional anyway, so we can skip them
        db = admin.firestore()
      } catch (dbError) {
        console.error('Failed to create Firestore instance:', dbError.message)
        throw new Error(`Failed to create Firestore instance: ${dbError.message}`)
      }
      
      // Try a simple read operation first to test authentication
      try {
        const translationsRef = db.collection('translations')
        
        const [heDoc, enDoc] = await Promise.all([
          translationsRef.doc('he').get(),
          translationsRef.doc('en').get()
        ])

        translations = {
          he: heDoc.exists ? heDoc.data() : {},
          en: enDoc.exists ? enDoc.data() : {}
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
    
    // Helper function to normalize image path: extract path from full URL if needed
    // Always returns just the path (e.g., "/school-website/image.jpg")
    const normalizeImagePath = (imagePathOrUrl) => {
      if (!imagePathOrUrl) return null
      
      // If it's already a path (starts with /), return as-is
      if (imagePathOrUrl.startsWith('/')) {
        return imagePathOrUrl
      }
      
      // If it's a full URL, extract the path
      if (imagePathOrUrl.startsWith('http')) {
        try {
          const url = new URL(imagePathOrUrl)
          return url.pathname
        } catch {
          // If URL parsing fails, try to extract path manually
          const match = imagePathOrUrl.match(/\/school-website\/.+$/)
          return match ? match[0] : imagePathOrUrl
        }
      }
      
      // Otherwise return as-is (might be a relative path)
      return imagePathOrUrl
    }
    
    // Fetch images from Firebase and add to JSON
    // CRITICAL: Images MUST be included in the published JSON for production mode to work
    let images = {}
    try {
      // Ensure db is available - use existing or create new
      if (!db) {
        db = admin.firestore()
      }
      
      const imagesRef = db.collection('images')
      const imagesSnapshot = await imagesRef.get()
      
      if (!imagesSnapshot.empty) {
        imagesSnapshot.forEach((doc) => {
          const data = doc.data()
          const imageKey = doc.id
          
          // Try multiple possible field names for image location/path
          // Common field names: path, location, url, imageUrl, imagePath
          const imagePath = data.path || data.location || data.url || data.imageUrl || data.imagePath || null
          
          if (imagePath) {
            // Normalize path: always save path only, not full URL
            images[imageKey] = normalizeImagePath(imagePath)
          } else {
            // Still add the document ID to images object with null, so we know it exists
            images[imageKey] = null
          }
        })
      }
    } catch (imagesError) {
      console.error(`[${requestId}] ❌ Error fetching images from Firebase:`, imagesError)
      console.error(`[${requestId}] Images error code:`, imagesError.code)
      console.error(`[${requestId}] Images error message:`, imagesError.message)
      console.error(`[${requestId}] Images error details:`, imagesError.details || 'No details')
      console.error(`[${requestId}] Images error stack:`, imagesError.stack)
      
      // Try to provide helpful error message
      if (imagesError.code === 16 || imagesError.message.includes('UNAUTHENTICATED')) {
        console.error(`[${requestId}] ⚠️ Authentication error when fetching images. Check Firebase service account permissions.`)
      } else if (imagesError.code === 7 || imagesError.message.includes('PERMISSION_DENIED')) {
        console.error(`[${requestId}] ⚠️ Permission denied when fetching images. Service account needs Firestore read permissions.`)
      }
      
      // Don't throw error - allow publishing texts even if images fail
      // Images will be empty, but texts will still be published
    }
    
    // Add images to the JSON structure
    // CRITICAL: images MUST be at root level for production mode to load them
    const finalContent = {
      ...cleanedTranslations,
      images: images // Add images at root level for easy access in production mode
    }
    
    // Format as JSON string
    const jsonContent = JSON.stringify(finalContent, null, 2)
    
    // CRITICAL: Verify images are in the final JSON
    const parsedCheck = JSON.parse(jsonContent)
    
    if (!('images' in parsedCheck)) {
      console.error(`[${requestId}] ❌ CRITICAL: 'images' key is missing from final JSON!`)
    }

    // Determine GitHub API auth header (fine-grained tokens use Bearer, classic use token)
    const authHeader = GITHUB_TOKEN.startsWith('ghp_') 
      ? `token ${GITHUB_TOKEN}`
      : `Bearer ${GITHUB_TOKEN}`

    // Helper function to get file SHA (for reference, not used in single-commit approach)
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

    // Helper function to create a tree with multiple files
    const createTree = async (baseTreeSha, files) => {
      const tree = files.map(file => ({
        path: file.path,
        mode: '100644', // Regular file
        type: 'blob',
        sha: file.sha
      }))

      const treeResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'SchoolWebsite-Publish'
          },
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: tree
          })
        }
      )

      if (!treeResponse.ok) {
        const errorText = await treeResponse.text()
        throw new Error(`Failed to create tree: ${treeResponse.status} - ${errorText}`)
      }

      return await treeResponse.json()
    }

    // Helper function to create a blob (file content)
    const createBlob = async (content) => {
      const blobResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/blobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'SchoolWebsite-Publish'
          },
          body: JSON.stringify({
            content: content,
            encoding: 'utf-8'
          })
        }
      )

      if (!blobResponse.ok) {
        const errorText = await blobResponse.text()
        throw new Error(`Failed to create blob: ${blobResponse.status} - ${errorText}`)
      }

      return await blobResponse.json()
    }

    // Helper function to create a commit
    const createCommit = async (treeSha, parentSha, message) => {
      const commitResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'SchoolWebsite-Publish'
          },
          body: JSON.stringify({
            message: message,
            tree: treeSha,
            parents: [parentSha]
          })
        }
      )

      if (!commitResponse.ok) {
        const errorText = await commitResponse.text()
        throw new Error(`Failed to create commit: ${commitResponse.status} - ${errorText}`)
      }

      return await commitResponse.json()
    }

    // Helper function to update ref (branch)
    const updateRef = async (commitSha) => {
      const refResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/main`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'SchoolWebsite-Publish'
          },
          body: JSON.stringify({
            sha: commitSha
          })
        }
      )

      if (!refResponse.ok) {
        const errorText = await refResponse.text()
        throw new Error(`Failed to update ref: ${refResponse.status} - ${errorText}`)
      }

      return await refResponse.json()
    }

    // Update both files in a SINGLE commit using Git Data API
    // This ensures only ONE commit is created, not two separate commits
    const filePaths = [
      GITHUB_FILE_PATH,  // content/texts.json (version control)
      'public/content/texts.json'  // public/content/texts.json (served by Vite)
    ]

    try {
      // Step 1: Get current commit SHA and tree SHA
      const refResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/main`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SchoolWebsite-Publish'
          }
        }
      )

      if (!refResponse.ok) {
        throw new Error(`Failed to get ref: ${refResponse.status}`)
      }

      const refData = await refResponse.json()
      const currentCommitSha = refData.object.sha

      // Step 2: Get current commit to get tree SHA
      const commitResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits/${currentCommitSha}`,
        {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SchoolWebsite-Publish'
          }
        }
      )

      if (!commitResponse.ok) {
        throw new Error(`Failed to get commit: ${commitResponse.status}`)
      }

      const commitData = await commitResponse.json()
      const baseTreeSha = commitData.tree.sha

      // Step 3: Create blobs for both files
      const blobPromises = filePaths.map(async (filePath) => {
        const blob = await createBlob(jsonContent)
        return { path: filePath, sha: blob.sha }
      })
      const fileBlobs = await Promise.all(blobPromises)

      // Step 4: Create tree with both files
      const tree = await createTree(baseTreeSha, fileBlobs)

      // Step 5: Create commit with the new tree
      const commitMessage = req.body.commitMessage || 
        `Update site texts from Firebase - ${new Date().toISOString()}`
      const commit = await createCommit(tree.sha, currentCommitSha, commitMessage)

      // Step 6: Update ref to point to new commit
      await updateRef(commit.sha)

      // Check if images were included
      const imagesIncluded = Object.keys(images).length > 0
      const imagesWithValues = Object.values(images).filter(v => v !== null && v !== undefined).length
      
      return res.status(200).json({
        success: true,
        message: `Texts published successfully - ${filePaths.length} files updated in a single commit`,
        commit: {
          sha: commit.sha,
          message: commitMessage,
          url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/commit/${commit.sha}`
        },
        files: filePaths.map(path => ({ path })),
        requestId: requestId,
        images: {
          included: imagesIncluded,
          count: Object.keys(images).length,
          withValues: imagesWithValues,
          ...(imagesIncluded && imagesWithValues === 0 && {
            warning: 'Images collection found but no images have valid path/location/url fields. Check Firebase images collection structure.'
          }),
          ...(!imagesIncluded && {
            warning: 'No images found in Firebase. Images collection may be empty or images may not have been uploaded yet.'
          })
        }
      })

    } catch (error) {
      console.error(`[${requestId}] ❌ Error updating files in single commit:`, error)
      console.error(`[${requestId}] Error details:`, error.message)
      console.error(`[${requestId}] Error stack:`, error.stack)
      
      // Fallback: If Git Data API fails, throw error (don't create multiple commits)
      // The single-commit approach should work, so if it fails, it's a real error
      throw error
    }

  } catch (error) {
    console.error(`[${requestId}] ❌ Publish error:`, error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      requestId: requestId,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
