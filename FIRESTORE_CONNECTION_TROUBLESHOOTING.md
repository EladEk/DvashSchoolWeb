# Firestore Connection Timeout Troubleshooting Guide

## Problem
You're seeing errors like:
- `ERR_CONNECTION_TIMED_OUT` when trying to connect to Firestore
- `WebChannelConnection RPC 'Listen' stream transport errored`
- "משתמש לא נמצא" (User not found) even when the user exists

## Root Causes

### 1. Firestore API Not Enabled
The Cloud Firestore API must be enabled in Google Cloud Console.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (`dvashschoolweb`)
3. Go to **APIs & Services** → **Library**
4. Search for "Cloud Firestore API"
5. Click on it and ensure it's **Enabled**
6. If disabled, click **Enable**

### 2. Network Connectivity Issues
Your internet connection may be blocking Firestore requests.

**Solution:**
- Check your internet connection
- Try accessing from a different network
- Check if a firewall or proxy is blocking `firestore.googleapis.com`
- Try disabling VPN if you're using one

### 3. Firestore Database Not Initialized
The Firestore database may not be properly set up.

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`dvashschoolweb`)
3. Go to **Firestore Database**
4. If you see "Create database", click it and follow the setup wizard
5. Choose **Production mode** or **Test mode** (for development)
6. Select a location (e.g., `us-central1`)

### 4. Firestore Security Rules Blocking Access
Security rules may be preventing connections.

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → **Firestore Database** → **Rules**
3. Ensure rules allow read access for the `appUsers` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to appUsers collection
    match /appUsers/{userId} {
      allow read: if true; // Or use proper authentication checks
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ... other rules
  }
}
```

### 5. Browser/Network Configuration
Some browsers or network configurations may block long-lived connections.

**Solution:**
- Try a different browser
- Clear browser cache and cookies
- Disable browser extensions that might interfere
- Check browser console for additional error details

## What We've Fixed

### Improved Error Handling
- Added timeout handling (15 seconds) to prevent hanging queries
- Better error messages distinguishing connection errors from "user not found"
- Improved error handling in real-time subscriptions

### Error Messages
- Connection errors now show: "שגיאת חיבור - אנא בדוק את חיבור האינטרנט ונסה שוב" (Hebrew)
- Connection errors now show: "Connection error - Please check your internet connection and try again" (English)
- "User not found" only appears when the user actually doesn't exist (not on connection errors)

## Testing the Fix

1. **Test with good connection:**
   - Try logging in with a valid username
   - Should work normally

2. **Test with connection issues:**
   - Disconnect internet temporarily
   - Try logging in
   - Should show connection error (not "user not found")

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for Firestore connection errors
   - Check Network tab for failed requests to `firestore.googleapis.com`

## Additional Steps

### Verify Firestore Configuration
1. Check `src/services/firebase.js` has correct project ID: `dvashschoolweb`
2. Verify API key is valid
3. Ensure Firestore is initialized correctly

### Check Firestore Console
1. Go to Firebase Console → Firestore Database
2. Verify `appUsers` collection exists
3. Check if there are any documents in the collection
4. Verify collection structure matches expected format

### Network Diagnostics
1. Open browser console (F12)
2. Go to Network tab
3. Filter by "firestore"
4. Try logging in
5. Check if requests are being made
6. Check response status codes

## Still Having Issues?

If you're still experiencing connection timeouts:

1. **Check Firebase Status:**
   - Visit [Firebase Status Page](https://status.firebase.google.com/)
   - Ensure all services are operational

2. **Verify Project Settings:**
   - Go to Firebase Console → Project Settings
   - Verify project ID matches: `dvashschoolweb`
   - Check API keys are valid

3. **Test with Firebase CLI:**
   ```bash
   firebase login
   firebase projects:list
   firebase firestore:indexes
   ```

4. **Contact Support:**
   - Check Firebase Console for error logs
   - Review Google Cloud Console logs
   - Contact Firebase support if needed

## Prevention

To prevent future connection issues:

1. **Enable Firestore API** before deploying
2. **Set up Firestore database** before first use
3. **Configure security rules** properly
4. **Monitor Firebase usage** in Firebase Console
5. **Set up alerts** for API quota limits

## Related Files

- `src/services/firebase.js` - Firebase initialization
- `src/services/firebaseDB.js` - Database operations with timeout handling
- `src/pages/ParliamentLogin.jsx` - Login page with improved error handling
- `src/translations/he.json` - Hebrew error messages
- `src/translations/en.json` - English error messages
