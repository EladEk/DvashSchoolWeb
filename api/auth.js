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
    return res.status(500).json({ 
      error: 'ImageKit private key not configured',
      message: 'Please set IMAGEKIT_PRIVATE_KEY environment variable in Vercel'
    })
  }

  try {
    const token = crypto.randomBytes(16).toString('hex')
    const expire = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    
    // ImageKit signature = HMAC-SHA1(privateKey, token + expire as string)
    const signature = crypto
      .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
      .update(token + expire.toString())
      .digest('hex')

    res.status(200).json({
      token,
      signature,
      expire
    })
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ error: 'Failed to generate authentication' })
  }
}
