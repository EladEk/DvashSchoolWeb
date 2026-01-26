/**
 * Vercel Serverless Function for ImageKit Authentication
 * 
 * This file should be placed in the /api directory for Vercel deployment
 * 
 * Environment Variables needed in Vercel:
 * - IMAGEKIT_PRIVATE_KEY: Your ImageKit private key
 */

import crypto from 'crypto'

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY
  
  if (!IMAGEKIT_PRIVATE_KEY) {
    console.error('IMAGEKIT_PRIVATE_KEY environment variable is not set')
    return res.status(500).json({ 
      error: 'ImageKit private key not configured',
      message: 'Please set IMAGEKIT_PRIVATE_KEY environment variable in Vercel'
    })
  }

  // Trim whitespace from private key (common issue with env vars)
  const trimmedPrivateKey = IMAGEKIT_PRIVATE_KEY.trim()
  
  if (!trimmedPrivateKey || trimmedPrivateKey.length === 0) {
    console.error('IMAGEKIT_PRIVATE_KEY is empty after trimming')
    return res.status(500).json({ 
      error: 'ImageKit private key is empty',
      message: 'Please set a valid IMAGEKIT_PRIVATE_KEY environment variable in Vercel'
    })
  }

  try {
    const token = crypto.randomBytes(16).toString('hex')
    const expire = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    
    // ImageKit signature = HMAC-SHA1(privateKey, token + expire as string)
    // According to ImageKit docs: signature = HMAC-SHA1(privateKey, token + expire)
    // where expire is the Unix timestamp as a string
    const expireStr = expire.toString()
    const signature = crypto
      .createHmac('sha1', trimmedPrivateKey)
      .update(token + expireStr)
      .digest('hex')

    // Log for debugging (don't log full signature for security)
    console.log('ImageKit auth generated:', {
      token: token.substring(0, 8) + '...',
      expire: expire,
      expireStr: expireStr,
      signature: signature.substring(0, 16) + '...',
      privateKeyLength: trimmedPrivateKey.length,
      privateKeyStartsWith: trimmedPrivateKey.substring(0, 10)
    })

    res.status(200).json({
      token,
      signature,
      expire
    })
  } catch (error) {
    console.error('Auth error:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      error: 'Failed to generate authentication',
      message: error.message
    })
  }
}
