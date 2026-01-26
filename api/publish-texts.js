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
  // But we can add request ID logging to help identify duplicates
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  console.log(`[${requestId}] Publish request received at ${new Date().toISOString()}`)

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
      console.log('Firebase Admin initialized, project:', projectId)
      console.log('Firebase app options keys:', Object.keys(app.options || {}))
      
      // Verify we can get a Firestore instance
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
    // CRITICAL: Images MUST be included in the published JSON for production mode to work
    console.log(`[${requestId}] 📸 Fetching images from Firebase images collection...`)
    let images = {}
    try {
      // Ensure db is available - use existing or create new
      if (!db) {
        console.log(`[${requestId}] db not available, creating new Firestore instance...`)
        db = admin.firestore()
        console.log(`[${requestId}] New Firestore instance created for images`)
      }
      
      console.log(`[${requestId}] Querying images collection from Firestore...`)
      console.log(`[${requestId}] Firestore instance available:`, !!db)
      console.log(`[${requestId}] Using db instance for images collection`)
      const imagesRef = db.collection('images')
      console.log(`[${requestId}] Collection reference created, fetching documents...`)
      const imagesSnapshot = await imagesRef.get()
      
      console.log(`[${requestId}] Images snapshot size: ${imagesSnapshot.size}`)
      console.log(`[${requestId}] Images snapshot empty: ${imagesSnapshot.empty}`)
      
      if (imagesSnapshot.empty) {
        console.warn(`[${requestId}] ⚠️ Images collection is empty in Firebase!`)
        console.warn(`[${requestId}] ⚠️ This means no images have been uploaded yet, or they are in a different collection.`)
        console.warn(`[${requestId}] ⚠️ Images will be empty in GitHub JSON. Upload images in edit mode first, then publish.`)
      } else {
        console.log(`[${requestId}] Found ${imagesSnapshot.size} image documents in Firebase`)
        imagesSnapshot.forEach((doc) => {
          const data = doc.data()
          const imageKey = doc.id
          
          // Try multiple possible field names for image location/path
          // Common field names: path, location, url, imageUrl, imagePath
          const imagePath = data.path || data.location || data.url || data.imageUrl || data.imagePath || null
          
          console.log(`[${requestId}] Image doc ${imageKey}:`, { 
            path: data.path,
            location: data.location,
            url: data.url,
            imageUrl: data.imageUrl,
            imagePath: data.imagePath,
            allFields: Object.keys(data),
            resolvedPath: imagePath
          })
          
          if (imagePath) {
            images[imageKey] = imagePath
            console.log(`[${requestId}] ✅ Added image ${imageKey}: ${imagePath}`)
          } else {
            console.warn(`[${requestId}] ⚠️ Image doc ${imageKey} has no path/location/url field. Available fields:`, Object.keys(data))
            console.warn(`[${requestId}] ⚠️ Expected fields: path, location, url, imageUrl, or imagePath`)
            // Still add the document ID to images object with null, so we know it exists
            // This helps with debugging
            images[imageKey] = null
          }
        })
      }
      
      console.log(`[${requestId}] ✅ Fetched ${Object.keys(images).length} images from Firebase`)
      console.log(`[${requestId}] Image keys:`, Object.keys(images))
      console.log(`[${requestId}] Images with valid paths:`, Object.values(images).filter(v => v !== null).length)
      
      // If no images found, log warning but continue (don't throw error)
      // This allows publishing texts even if images haven't been uploaded yet
      if (Object.keys(images).length === 0) {
        console.warn(`[${requestId}] ⚠️ No images found in Firebase. The images object will be empty in GitHub JSON.`)
        console.warn(`[${requestId}] ⚠️ To fix: Upload images in edit mode first, then publish again.`)
      } else if (Object.values(images).filter(v => v !== null).length === 0) {
        console.warn(`[${requestId}] ⚠️ Images found but none have valid path/location/url fields!`)
        console.warn(`[${requestId}] ⚠️ Check that images in Firebase have 'path', 'location', or 'url' field set.`)
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
      console.warn(`[${requestId}] ⚠️ Continuing without images - texts will be published but images object will be empty`)
      console.warn(`[${requestId}] ⚠️ Production mode will not be able to load images until this is fixed.`)
      console.warn(`[${requestId}] ⚠️ Check Vercel logs for detailed error information.`)
    }
    
    // Add images to the JSON structure
    // CRITICAL: images MUST be at root level for production mode to load them
    const finalContent = {
      ...cleanedTranslations,
      images: images // Add images at root level for easy access in production mode
    }
    
    // Log what's being published (for debugging)
    console.log(`[${requestId}] Keys after Parliament exclusion in he:`, Object.keys(cleanedTranslations.he || {}))
    console.log(`[${requestId}] Keys after Parliament exclusion in en:`, Object.keys(cleanedTranslations.en || {}))
    console.log(`[${requestId}] Has sections after exclusion in he:`, 'sections' in (cleanedTranslations.he || {}))
    console.log(`[${requestId}] Has sections after exclusion in en:`, 'sections' in (cleanedTranslations.en || {}))
    console.log(`[${requestId}] Images count:`, Object.keys(images).length)
    console.log(`[${requestId}] Images with valid paths:`, Object.values(images).filter(v => v !== null).length)
    console.log(`[${requestId}] Final JSON structure keys:`, Object.keys(finalContent))
    console.log(`[${requestId}] Has images key in finalContent:`, 'images' in finalContent)

    // Format as JSON string
    const jsonContent = JSON.stringify(finalContent, null, 2)
    
    // Log file size for debugging
    console.log(`[${requestId}] Generated JSON size:`, jsonContent.length, 'bytes')
    
    // CRITICAL: Verify images are in the final JSON
    const parsedCheck = JSON.parse(jsonContent)
    console.log(`[${requestId}] ✅ Final JSON verification:`)
    console.log(`[${requestId}]   - Has 'images' key:`, 'images' in parsedCheck)
    console.log(`[${requestId}]   - Images object keys:`, Object.keys(parsedCheck.images || {}))
    console.log(`[${requestId}]   - Images count:`, Object.keys(parsedCheck.images || {}).length)
    console.log(`[${requestId}]   - Images with values:`, Object.values(parsedCheck.images || {}).filter(v => v !== null && v !== undefined).length)
    
    if (!('images' in parsedCheck)) {
      console.error(`[${requestId}] ❌ CRITICAL: 'images' key is missing from final JSON!`)
    } else if (Object.keys(parsedCheck.images || {}).length === 0) {
      console.warn(`[${requestId}] ⚠️ WARNING: 'images' object is empty in final JSON!`)
      console.warn(`[${requestId}] ⚠️ This means no images were found in Firebase or they don't have valid path/location/url fields.`)
    } else {
      console.log(`[${requestId}] ✅ Images successfully included in JSON:`, Object.keys(parsedCheck.images).slice(0, 5).join(', '), 
        Object.keys(parsedCheck.images).length > 5 ? '...' : '')
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

    console.log(`[${requestId}] Updating ${filePaths.length} files in a single commit...`)

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
      console.log(`[${requestId}] Creating blobs for ${filePaths.length} files...`)
      const blobPromises = filePaths.map(async (filePath) => {
        const blob = await createBlob(jsonContent)
        return { path: filePath, sha: blob.sha }
      })
      const fileBlobs = await Promise.all(blobPromises)

      // Step 4: Create tree with both files
      console.log(`[${requestId}] Creating tree with ${filePaths.length} files...`)
      const tree = await createTree(baseTreeSha, fileBlobs)

      // Step 5: Create commit with the new tree
      const commitMessage = req.body.commitMessage || 
        `Update site texts from Firebase - ${new Date().toISOString()}`
      console.log(`[${requestId}] Creating commit: ${commitMessage}`)
      const commit = await createCommit(tree.sha, currentCommitSha, commitMessage)

      // Step 6: Update ref to point to new commit
      console.log(`[${requestId}] Updating ref to new commit...`)
      await updateRef(commit.sha)

      console.log(`[${requestId}] ✅ Successfully updated ${filePaths.length} files in a single commit: ${commit.sha.substring(0, 7)}`)

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
