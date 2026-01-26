/**
 * Vite Plugin for ImageKit Authentication
 * This plugin creates a middleware that handles /api/auth requests
 * without needing a separate server
 */

import crypto from 'crypto'

export default function imagekitAuth() {
  return {
    name: 'imagekit-auth',
    configureServer(server) {
      server.middlewares.use('/api/auth', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          })
          res.end()
          return
        }

        if (req.method !== 'GET') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        // Get private key from environment
        const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || 'private_+N6XxqD7t+GzrL0THcYDLDfwm0A='
        
        if (!IMAGEKIT_PRIVATE_KEY || IMAGEKIT_PRIVATE_KEY === 'your_private_key_here') {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ 
            error: 'ImageKit private key not configured',
            message: 'Please set IMAGEKIT_PRIVATE_KEY environment variable'
          }))
          return
        }

        try {
          // Generate token and signature
          // ImageKit signature = HMAC-SHA1(privateKey, token + expire)
          const token = crypto.randomBytes(16).toString('hex')
          const expire = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
          
          // ImageKit signature formula: HMAC-SHA1(privateKey, token + expire)
          // expire must be converted to string for concatenation
          const expireStr = expire.toString()
          const signature = crypto
            .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
            .update(token + expireStr)
            .digest('hex')
          
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          })
          res.end(JSON.stringify({
            token,
            signature,
            expire
          }))
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Failed to generate authentication' }))
        }
      })
    }
  }
}
