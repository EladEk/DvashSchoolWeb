/**
 * Firebase Cloud Function for ImageKit Authentication
 * 
 * This file should be placed in the /functions/src directory
 * 
 * To deploy:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Initialize: firebase init functions
 * 4. Set config: firebase functions:config:set imagekit.private_key="your_private_key"
 * 5. Deploy: firebase deploy --only functions
 * 
 * The function will be available at:
 * https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/imagekitAuth
 */

import * as functions from 'firebase-functions';
import * as crypto from 'crypto';

export const imagekitAuth = functions.https.onRequest((req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const IMAGEKIT_PRIVATE_KEY = functions.config().imagekit?.private_key;
  
  if (!IMAGEKIT_PRIVATE_KEY) {
    res.status(500).json({ 
      error: 'ImageKit private key not configured',
      message: 'Please set imagekit.private_key in Firebase config'
    });
    return;
  }

  try {
    const token = crypto.randomBytes(16).toString('hex');
    const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    // ImageKit signature = HMAC-SHA1(privateKey, token + expire as string)
    const signature = crypto
      .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
      .update(token + expire.toString())
      .digest('hex');

    res.json({
      token,
      signature,
      expire
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Failed to generate authentication' });
  }
});
