# Solution: Regenerate Service Account Key

Since everything else is correct:
- ✅ IAM roles are correct
- ✅ Firestore API is enabled  
- ✅ Database exists
- ✅ Firebase Admin initializes

The issue is likely the **service account key itself**. Let's regenerate it:

## Step 1: Generate New Service Account Key

1. **Go to:** https://console.cloud.google.com/iam-admin/serviceaccounts?project=dvashschoolweb

2. **Click on:** `firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com`

3. **Go to "Keys" tab** (at the top)

4. **Click "ADD KEY" → "Create new key"**

5. **Select "JSON"** format

6. **Click "CREATE"**

7. **Download the JSON file** (it will download automatically)

## Step 2: Update Vercel Environment Variable

1. **Open the downloaded JSON file** in a text editor

2. **Copy the ENTIRE contents** (it's all on one line or multiple lines - both work)

3. **In Vercel:**
   - Go to your project
   - Settings → Environment Variables
   - Find `FIREBASE_SERVICE_ACCOUNT`
   - Click "Edit"
   - **Delete everything** in the value field
   - **Paste the new JSON** (make sure it's complete)
   - Click "Save"

4. **Important:** Make sure the JSON includes:
   - `"project_id": "dvashschoolweb"`
   - `"private_key": "-----BEGIN PRIVATE KEY-----..."`
   - `"client_email": "firebase-adminsdk-fbsvc@..."`

## Step 3: Redeploy

1. **Go to Deployments**
2. **Click "..." on latest deployment**
3. **Click "Redeploy"**
4. **Wait for deployment to complete**

## Step 4: Test Again

Try publishing again. The new key should work!

## Why This Works

Sometimes service account keys can have issues:
- Keys generated before certain Firebase updates
- Keys that were copied incorrectly
- Keys that lost some encoding

A fresh key usually resolves authentication issues when everything else is correct.
