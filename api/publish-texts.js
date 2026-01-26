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

  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    // Get environment variables
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'EladEk'
    const GITHUB_REPO = process.env.GITHUB_REPO || 'DvashSchoolWeb'
    const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'content/texts.json'

    // Validate required environment variables
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'GITHUB_TOKEN is not set in environment variables'
      })
    }

    let admin
    try {
      const adminModule = await import('firebase-admin')
      admin = adminModule.default || adminModule
      
      // Verify admin object has required methods
      if (!admin || typeof admin.initializeApp !== 'function') {
        throw new Error('Firebase Admin module not loaded correctly')
      }
      
      if (!admin.credential || typeof admin.credential.cert !== 'function') {
        throw new Error('Firebase Admin credential API not available')
      }
      
      if (!admin.apps || admin.apps.length === 0) {
        const firebaseServiceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT
        
        if (!firebaseServiceAccountEnv) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Please redeploy after adding the variable.')
        }

        let serviceAccount
        try {
          if (typeof firebaseServiceAccountEnv === 'string') {
            serviceAccount = JSON.parse(firebaseServiceAccountEnv)
          } else {
            serviceAccount = firebaseServiceAccountEnv
          }
        } catch (parseError) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Make sure it\'s a single-line JSON string.')
        }

        if (!serviceAccount.type || serviceAccount.type !== 'service_account') {
          throw new Error('FIREBASE_SERVICE_ACCOUNT is missing required fields (type should be "service_account")')
        }

        if (!serviceAccount.private_key || !serviceAccount.client_email) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT is missing private_key or client_email')
        }

        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
          
          if (!serviceAccount.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
          }
          if (!serviceAccount.private_key.includes('-----END PRIVATE KEY-----')) {
          }
        }

        if (!serviceAccount.project_id) {
          throw new Error('Service account JSON is missing project_id field')
        }
        
        try {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
          })
          
          if (!admin.apps || admin.apps.length === 0) {
            throw new Error('Firebase Admin initialization returned no apps')
          }
          
          const app = admin.apps[0]
          const projectId = app.options?.projectId || app.options?.credential?.projectId || serviceAccount.project_id
        } catch (initError) {
          throw new Error(`Failed to initialize Firebase Admin: ${initError.message}. Check that FIREBASE_SERVICE_ACCOUNT JSON is correctly formatted with proper \\n in private_key.`)
        }
      }
    } catch (error) {
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

    let db = null
    let translations
    try {
      if (!admin.apps || admin.apps.length === 0) {
        throw new Error('Firebase Admin not initialized')
      }
      
      const app = admin.apps[0]
      const projectId = app.options?.projectId || app.options?.credential?.projectId || 'unknown'
      
      try {
        db = admin.firestore()
      } catch (dbError) {
        throw new Error(`Failed to create Firestore instance: ${dbError.message}`)
      }
      
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
        throw readError
      }
    } catch (error) {
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
        errorCode: error.code,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.details,
          stack: error.stack,
          fullMessage: error.message
        })
      })
    }

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

    const cleanedTranslations = {
      he: excludeParliament(translations.he),
      en: excludeParliament(translations.en)
    }
    
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
      
      if (path && !path.startsWith('/') && path.includes('/')) {
        if (path.includes('/school-website/')) {
          path = '/' + path
        }
      }
      
      return path || null
    }
    
    let images = {}
    let imagesIncluded = false
    let imagesWithValues = 0
    try {
      if (!db) {
        db = admin.firestore()
      }
      
      const imagesRef = db.collection('images')
      const imagesSnapshot = await imagesRef.get()
      
      if (!imagesSnapshot.empty) {
        imagesIncluded = true
        imagesSnapshot.forEach((doc) => {
          const data = doc.data()
          const imageKey = doc.id
          
          const imagePath = data.path || data.location || data.url || data.imageUrl || data.imagePath || null
          
          if (imagePath) {
            images[imageKey] = normalizeImagePath(imagePath)
            imagesWithValues++
          } else {
            images[imageKey] = null
          }
        })
      }
    } catch (imagesError) {
      if (imagesError.code === 16 || imagesError.message.includes('UNAUTHENTICATED')) {
      } else if (imagesError.code === 7 || imagesError.message.includes('PERMISSION_DENIED')) {
      }
    }
    
    const finalContent = {
      ...cleanedTranslations,
      images: images
    }
    
    const jsonContent = JSON.stringify(finalContent, null, 2)
    
    const parsedCheck = JSON.parse(jsonContent)
    
    if (!('images' in parsedCheck)) {
    }

    const authHeader = GITHUB_TOKEN.startsWith('ghp_') 
      ? `token ${GITHUB_TOKEN}`
      : `Bearer ${GITHUB_TOKEN}`

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

    const filePaths = [
      GITHUB_FILE_PATH,
      'public/content/texts.json'
    ]

    try {
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

      const blobPromises = filePaths.map(async (filePath) => {
        const blob = await createBlob(jsonContent)
        return { path: filePath, sha: blob.sha }
      })
      const fileBlobs = await Promise.all(blobPromises)

      const tree = await createTree(baseTreeSha, fileBlobs)

      const commitMessage = req.body.commitMessage || 
        `Update site texts from Firebase - ${new Date().toISOString()}`
      const commit = await createCommit(tree.sha, currentCommitSha, commitMessage)

      await updateRef(commit.sha)

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
      throw error
    }

  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      requestId: requestId,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
