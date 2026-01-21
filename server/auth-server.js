/**
 * Simple ImageKit Authentication Server
 * 
 * Run this server with: node server/auth-server.js
 * Or use: npm run auth-server
 * 
 * Make sure to set IMAGEKIT_PRIVATE_KEY environment variable
 * 
 * Example:
 *   export IMAGEKIT_PRIVATE_KEY=your_private_key_here
 *   npm run auth-server
 */

import http from 'http';
import crypto from 'crypto';
import url from 'url';

const PORT = process.env.PORT || 3001;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';

if (!IMAGEKIT_PRIVATE_KEY) {
  console.error('❌ ERROR: IMAGEKIT_PRIVATE_KEY environment variable is not set!');
  console.error('Please set it before running the server:');
  console.error('  export IMAGEKIT_PRIVATE_KEY=your_private_key_here');
  console.error('  node server/auth-server.js');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = url.parse(req.url, true);

  // Only handle GET /auth
  if (req.method === 'GET' && parsedUrl.pathname === '/auth') {
    try {
      // Generate token and signature
      const token = crypto.randomBytes(16).toString('hex');
      const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      // Create signature using HMAC-SHA1
      // ImageKit signature = HMAC-SHA1(privateKey, token + expire as string)
      const signature = crypto
        .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
        .update(token + expire.toString())
        .digest('hex');
      
      // Return JSON response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        token,
        signature,
        expire
      }));

      console.log(`✅ Auth request served at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('❌ Auth error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to generate authentication' }));
    }
  } else {
    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 ImageKit Auth Server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/auth`);
  console.log(`🔑 Using private key: ${IMAGEKIT_PRIVATE_KEY.substring(0, 10)}...`);
  console.log('\n⚠️  Make sure to update the authenticationEndpoint in ImageEditor.jsx to:');
  console.log(`   http://localhost:${PORT}/auth\n`);
});
