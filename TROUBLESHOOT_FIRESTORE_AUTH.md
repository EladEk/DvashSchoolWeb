# Troubleshooting UNAUTHENTICATED Error Despite Correct IAM Roles

## Current Status
✅ Service account has correct IAM roles:
- Firebase Admin SDK Administrator Service Agent
- Service Account Token Creator

✅ Firebase Admin initializes successfully
✅ Project ID is correct

❌ Still getting `UNAUTHENTICATED` when accessing Firestore

## Possible Causes & Solutions

### 1. Firestore API Not Enabled
**Check:** https://console.cloud.google.com/apis/library?project=dvashschoolweb

1. Search for "Cloud Firestore API"
2. Make sure it shows **"Enabled"**
3. If not, click **"Enable"** and wait 1-2 minutes

### 2. Firestore Database Doesn't Exist
The database might not be created yet.

**Check:** https://console.cloud.google.com/firestore/databases?project=dvashschoolweb

1. If you see "Create database", you need to create it first
2. Choose **Native mode** (recommended) or **Datastore mode**
3. Select a location
4. Create the database

### 3. Database Mode Mismatch
If your database is in **Datastore mode** but code expects **Native mode** (or vice versa), you might get auth errors.

**Check:** https://console.cloud.google.com/firestore/databases?project=dvashschoolweb

- Look at your database - it should show the mode
- Make sure your code matches the database mode

### 4. Organization Policies
Some organization policies can block service account access.

**Check:** https://console.cloud.google.com/iam-admin/org-policies?project=dvashschoolweb

Look for policies that might restrict service account access.

### 5. Service Account Key Age
Sometimes very old service account keys can have issues. Try generating a new key:

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=dvashschoolweb
2. Click on `firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com`
3. Go to "Keys" tab
4. Generate a new JSON key
5. Update `FIREBASE_SERVICE_ACCOUNT` in Vercel with the new key
6. Redeploy

### 6. Wait for Propagation
If you just added the role, wait 5-10 minutes for full propagation.

### 7. Check Firestore Rules
Make sure Firestore security rules allow read access:

**Check:** https://console.firebase.google.com/project/dvashschoolweb/firestore/rules

The rules should allow reads (at least for admin/service accounts).

## Most Likely Fix

Based on the error, I suspect:
1. **Firestore API not enabled** - Most common cause
2. **Database doesn't exist** - Second most common

Check these two first!
