# Firebase Authentication Troubleshooting

## Current Error
`UNAUTHENTICATED: Request had invalid authentication credentials`

This error happens when accessing Firestore, which means:
- ✅ Firebase Admin initialized successfully  
- ❌ Service account can't authenticate with Firestore

## Most Likely Cause: Missing Firestore Permissions

The service account needs Firestore permissions in Google Cloud Console.

### Fix Steps:

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/iam-admin/iam?project=dvashschoolweb

2. **Find your service account:**
   - Look for: `firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com`

3. **Add Required Role:**
   - Click the pencil icon (Edit) next to the service account
   - Click "ADD ANOTHER ROLE"
   - Add: **Firebase Admin SDK Administrator Service Agent**
   - Click "SAVE"

4. **Alternative Roles (if above doesn't exist):**
   - **Cloud Datastore User**
   - **Cloud Firestore User**
   - **Firebase Admin SDK Administrator Service Agent**

5. **Wait 1-2 minutes** for permissions to propagate

6. **Try publishing again**

## Verify Firestore API is Enabled

1. Go to: https://console.cloud.google.com/apis/library?project=dvashschoolweb
2. Search for "Cloud Firestore API"
3. Make sure it shows **Enabled**
4. If not, click "Enable"

## Check Vercel Function Logs

1. Vercel Dashboard → Your Project → Functions → `publish-texts`
2. Look for:
   - "Firebase Admin initialized successfully"
   - "Attempting to fetch translations from Firestore..."
   - Error details

The improved error handling will show more specific errors if permissions are the issue.
