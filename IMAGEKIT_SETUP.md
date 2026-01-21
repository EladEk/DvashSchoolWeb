# ImageKit Authentication Endpoint Setup

ImageKit דורש authentication endpoint מאובטח להעלאת תמונות. להלן הוראות להגדרת endpoint זה.

## אפשרות 1: Node.js/Express Server

צור קובץ `server/auth.js`:

```javascript
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// ImageKit credentials - שמור אותם ב-environment variables
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || 'private_+N6XxqD7t+GzrL0THcYDLDfwm0A=';
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || 'public_Ubfj3JyFAbabaMCqAGRpVj+Jy7c=';

router.get('/auth', (req, res) => {
  try {
    // Generate token and signature
    const token = crypto.randomBytes(16).toString('hex');
    const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    // Create signature
    const signature = crypto
      .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
      .update(token + expire)
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

module.exports = router;
```

## אפשרות 2: Serverless Function (Vercel/Netlify)

### Vercel

צור קובץ `api/auth.js`:

```javascript
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const crypto = require('crypto');
  const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
  
  if (!IMAGEKIT_PRIVATE_KEY) {
    return res.status(500).json({ error: 'ImageKit private key not configured' });
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expire = Math.floor(Date.now() / 1000) + 3600;
  
  const signature = crypto
    .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
    .update(token + expire)
    .digest('hex');

  res.json({
    token,
    signature,
    expire
  });
}
```

### Netlify

צור קובץ `netlify/functions/auth.js`:

```javascript
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const crypto = require('crypto');
  const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
  
  if (!IMAGEKIT_PRIVATE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ImageKit private key not configured' })
    };
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expire = Math.floor(Date.now() / 1000) + 3600;
  
  const signature = crypto
    .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
    .update(token + expire)
    .digest('hex');

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token,
      signature,
      expire
    })
  };
};
```

## אפשרות 3: Firebase Cloud Function

צור קובץ `functions/src/index.ts`:

```typescript
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
    res.status(500).json({ error: 'ImageKit private key not configured' });
    return;
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expire = Math.floor(Date.now() / 1000) + 3600;
  
  const signature = crypto
    .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
    .update(token + expire)
    .digest('hex');

  res.json({
    token,
    signature,
    expire
  });
});
```

## הגדרת Environment Variables

הוסף את ה-private key של ImageKit ל-environment variables:

```bash
IMAGEKIT_PRIVATE_KEY=your_private_key_here
```

אתה יכול למצוא את ה-private key ב-ImageKit Dashboard:
1. לך ל-ImageKit Dashboard
2. Settings > API Keys
3. העתק את ה-Private API Key

## עדכון הקוד ב-React

עדכן את ה-authentication endpoint ב-`ImageEditor.jsx` או ב-`.env`:

```env
VITE_IMAGEKIT_AUTH_ENDPOINT=https://your-server.com/auth
```

או ישירות בקוד:

```javascript
authenticationEndpoint="https://your-server.com/auth"
```

## פתרון זמני לפיתוח

אם אתה בפיתוח מקומי, תוכל ליצור proxy ב-`vite.config.js`:

```javascript
export default {
  server: {
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
}
```

ואז עדכן את ה-endpoint ל-`/api/auth`.
