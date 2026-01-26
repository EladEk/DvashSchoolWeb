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
  let trimmedPrivateKey = IMAGEKIT_PRIVATE_KEY.trim()
  
  // Handle potential URL encoding issues (if key was URL-encoded when stored)
  // Check if the key looks URL-encoded and decode it
  if (trimmedPrivateKey.includes('%2F') || trimmedPrivateKey.includes('%3D')) {
    console.log('Private key appears to be URL-encoded, decoding...')
    try {
      trimmedPrivateKey = decodeURIComponent(trimmedPrivateKey)
      console.log('Decoded private key length:', trimmedPrivateKey.length)
    } catch (decodeError) {
      console.warn('Failed to decode private key, using as-is:', decodeError.message)
    }
  }
  
  if (!trimmedPrivateKey || trimmedPrivateKey.length === 0) {
    console.error('IMAGEKIT_PRIVATE_KEY is empty after trimming')
    return res.status(500).json({ 
      error: 'ImageKit private key is empty',
      message: 'Please set a valid IMAGEKIT_PRIVATE_KEY environment variable in Vercel'
    })
  }

  // Validate private key format
  if (!trimmedPrivateKey.startsWith('private_')) {
    console.error('IMAGEKIT_PRIVATE_KEY does not start with "private_"')
    console.error('Private key starts with:', trimmedPrivateKey.substring(0, 15))
    return res.status(500).json({ 
      error: 'Invalid ImageKit private key format',
      message: 'Private key must start with "private_". Please check your ImageKit dashboard.'
    })
  }

  // Log key info for debugging (don't log full key for security)
  console.log('Private key info:', {
    length: trimmedPrivateKey.length,
    startsWith: trimmedPrivateKey.substring(0, 15),
    endsWith: trimmedPrivateKey.substring(trimmedPrivateKey.length - 5),
    hasForwardSlash: trimmedPrivateKey.includes('/'),
    hasEquals: trimmedPrivateKey.includes('=')
  })

  try {
    const token = crypto.randomBytes(16).toString('hex')
    const expire = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    
    // ImageKit signature = HMAC-SHA1(privateKey, token + expire as string)
    // According to ImageKit docs: signature = HMAC-SHA1(privateKey, token + expire)
    // where expire is the Unix timestamp as a string
    // IMPORTANT: The signature must be calculated with the exact same string format
    // that will be sent to ImageKit (token + expire as string, no spaces)
    const expireStr = expire.toString()
    const signatureInput = token + expireStr // No spaces, exact concatenation
    
    // Calculate signature using HMAC-SHA1
    const signature = crypto
      .createHmac('sha1', trimmedPrivateKey)
      .update(signatureInput, 'utf8') // Explicitly specify UTF-8 encoding
      .digest('hex')

    // Verify signature length (HMAC-SHA1 produces 40 hex characters)
    if (signature.length !== 40) {
      console.error('Signature length is incorrect:', signature.length, 'expected 40')
    }

    // Log for debugging (don't log full signature for security)
    console.log('ImageKit auth generated:', {
      token: token.substring(0, 8) + '...',
      expire: expire,
      expireStr: expireStr,
      signatureInputLength: signatureInput.length,
      signatureInputPreview: signatureInput.substring(0, 20) + '...', // Show first part of input
      signature: signature.substring(0, 16) + '...',
      signatureLength: signature.length,
      privateKeyLength: trimmedPrivateKey.length,
      privateKeyStartsWith: trimmedPrivateKey.substring(0, 15),
      privateKeyEndsWith: trimmedPrivateKey.substring(trimmedPrivateKey.length - 5)
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
