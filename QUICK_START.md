# Quick Start Guide - ImageKit Authentication

## 🚀 Fastest Way to Get Started (Local Development)

### Step 1: Get Your ImageKit Private Key

1. Go to [ImageKit Dashboard](https://imagekit.io/dashboard)
2. Navigate to **Settings > API Keys**
3. Copy your **Private API Key**

### Step 2: Set Environment Variable and Start Authentication Server

**Windows (PowerShell) - Run in a NEW terminal:**
```powershell
$env:IMAGEKIT_PRIVATE_KEY="private_+N6XxqD7t+GzrL0THcYDLDfwm0A="
npm run auth-server
```

**Windows (CMD) - Run in a NEW terminal:**
```cmd
set IMAGEKIT_PRIVATE_KEY=private_+N6XxqD7t+GzrL0THcYDLDfwm0A=
npm run auth-server
```

**Linux/Mac - Run in a NEW terminal:**
```bash
export IMAGEKIT_PRIVATE_KEY=private_+N6XxqD7t+GzrL0THcYDLDfwm0A=
npm run auth-server
```

You should see:
```
🚀 ImageKit Auth Server running on http://localhost:3001
📡 Endpoint: http://localhost:3001/auth
```

**⚠️ IMPORTANT: Keep this terminal open! The server must be running.**

### Step 3: Start React App

In a DIFFERENT terminal (keep the auth server running), run:
```bash
npm run dev
```

The app is configured to use `/api/auth` which proxies to `http://localhost:3001/auth` via Vite.

### Step 5: Test Image Upload

1. Open the website in admin mode
2. Click on any image placeholder
3. Select an image file
4. Click "העלה" (Upload)
5. The image should upload successfully!

## 📝 For Production Deployment

### Option 1: Vercel

1. Deploy your code to Vercel
2. Add environment variable in Vercel Dashboard:
   - Go to Project Settings > Environment Variables
   - Add `IMAGEKIT_PRIVATE_KEY` with your private key
3. The `/api/auth.js` file will automatically be deployed as a serverless function
4. Update `VITE_IMAGEKIT_AUTH_ENDPOINT` in your `.env` to point to your Vercel domain:
   ```
   VITE_IMAGEKIT_AUTH_ENDPOINT=https://your-app.vercel.app/api/auth
   ```

### Option 2: Netlify

1. Deploy your code to Netlify
2. Add environment variable in Netlify Dashboard:
   - Go to Site settings > Environment variables
   - Add `IMAGEKIT_PRIVATE_KEY` with your private key
3. The `/netlify/functions/auth.js` file will automatically be deployed
4. Update `VITE_IMAGEKIT_AUTH_ENDPOINT` in your `.env`:
   ```
   VITE_IMAGEKIT_AUTH_ENDPOINT=https://your-app.netlify.app/.netlify/functions/auth
   ```

### Option 3: Firebase Functions

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init functions`
4. Set config: `firebase functions:config:set imagekit.private_key="your_private_key"`
5. Deploy: `firebase deploy --only functions`
6. Update `VITE_IMAGEKIT_AUTH_ENDPOINT` to your Firebase function URL

### Option 4: Custom Server

Use the `server/auth-server.js` file and deploy it to any Node.js hosting service.

## 🔧 Troubleshooting

### "שגיאה באימות. אנא הגדר authentication endpoint"

This means the authentication server is not running or not accessible.

**Solution:**
1. Make sure the auth server is running: `npm run auth-server`
2. Check that `IMAGEKIT_PRIVATE_KEY` is set correctly
3. Verify the endpoint URL in browser: `http://localhost:3001/auth` should return JSON

### CORS Errors

If you see CORS errors, make sure:
1. The authentication server has CORS headers enabled (already included in all examples)
2. You're accessing the endpoint from the correct origin

### "ImageKit private key not configured"

**Solution:**
1. Make sure you set the `IMAGEKIT_PRIVATE_KEY` environment variable
2. Restart the authentication server after setting the variable
3. For production, set it in your hosting platform's environment variables

## 📚 More Information

See [IMAGEKIT_SETUP.md](./IMAGEKIT_SETUP.md) for detailed setup instructions for different platforms.
