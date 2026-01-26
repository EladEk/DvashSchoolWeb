# Fix IAM Permissions - Service Account Needs Firestore Access

## ✅ Good News
Your Firebase Admin is initialized correctly! The issue is **IAM permissions**, not credential format.

## The Problem
The service account `firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com` doesn't have permission to read from Firestore.

## The Solution: Add IAM Role

### Step 1: Go to Google Cloud Console IAM
**Direct link:** https://console.cloud.google.com/iam-admin/iam?project=dvashschoolweb

### Step 2: Find Your Service Account
Look for: `firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com`

### Step 3: Add Required Role
1. Click the **pencil icon** (✏️ Edit) next to the service account
2. Click **"ADD ANOTHER ROLE"**
3. In the role dropdown, search for: **`Firebase Admin SDK Administrator Service Agent`**
4. Select it
5. Click **"SAVE"**

### Step 4: Wait for Propagation
- Wait **1-2 minutes** for IAM permissions to propagate
- Google Cloud needs time to update permissions across all services

### Step 5: Test Again
1. Go back to your admin dashboard
2. Click "Publish to GitHub"
3. It should work now! ✅

## Alternative Roles (if above doesn't exist)

If you can't find "Firebase Admin SDK Administrator Service Agent", try these in order:

1. **Cloud Datastore User** (for Firestore in Datastore mode)
2. **Cloud Firestore User** (for Firestore in Native mode)
3. **Firebase Admin SDK Administrator Service Agent** (preferred)

## Verify Firestore API is Enabled

While you're in Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/library?project=dvashschoolweb
2. Search for: **"Cloud Firestore API"**
3. Make sure it shows **"Enabled"**
4. If not, click **"Enable"**

## What Changed?

The logs show everything is working except permissions:
- ✅ Credentials are valid
- ✅ Firebase Admin initialized
- ✅ Project ID is correct
- ❌ **Missing IAM role** to access Firestore

After adding the role, wait 1-2 minutes and try again!
