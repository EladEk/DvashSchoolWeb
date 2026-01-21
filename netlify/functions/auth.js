/**
 * Netlify Serverless Function for ImageKit Authentication
 * 
 * This file should be placed in the /netlify/functions directory
 * 
 * Environment Variables needed in Netlify:
 * - IMAGEKIT_PRIVATE_KEY: Your ImageKit private key
 * 
 * To set environment variables in Netlify:
 * 1. Go to Site settings > Environment variables
 * 2. Add IMAGEKIT_PRIVATE_KEY with your private key value
 */

const crypto = require('crypto');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
  
  if (!IMAGEKIT_PRIVATE_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'ImageKit private key not configured',
        message: 'Please set IMAGEKIT_PRIVATE_KEY environment variable in Netlify'
      })
    };
  }

  try {
    const token = crypto.randomBytes(16).toString('hex');
    const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    // ImageKit signature = HMAC-SHA1(privateKey, token + expire as string)
    const signature = crypto
      .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
      .update(token + expire.toString())
      .digest('hex');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token,
        signature,
        expire
      })
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate authentication' })
    };
  }
};
