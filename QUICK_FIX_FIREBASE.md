# Quick Fix Guide - Firebase Authentication Error

## Current Issue
You're getting `UNAUTHENTICATED` error. The log shows `Firebase project ID: undefined`, which suggests the service account JSON might be missing the `project_id` field or the initialization isn't working correctly.

## Immediate Action Required

### Step 1: Check Vercel Function Logs
The enhanced logging will show exactly what's wrong. Go to:

**Vercel Dashboard → Your Project → Deployments → Latest → Functions → `publish-texts`**

Look for these log entries (they appear in order):
1. `Private key preview (first 50 chars):` - Should show `-----BEGIN PRIVATE KEY-----`
2. `Private key contains \n (literal):` - Should be `false` after fix
3. `Private key contains actual newlines:` - Should be `true` after fix
4. `Service account project_id:` - **MUST show `dvashschoolweb`** (not undefined!)
5. `Firebase Admin initialized successfully` - Should appear
6. `Firebase project ID:` - Should show `dvashschoolweb`

### Step 2: Verify Environment Variable
The `FIREBASE_SERVICE_ACCOUNT` in Vercel must include ALL fields, especially `project_id`:

```json
{
  "type": "service_account",
  "project_id": "dvashschoolweb",  ← MUST BE PRESENT
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com",
  ...
}
```

### Step 3: Update Environment Variable (If Needed)

1. **Copy the FULL JSON** from `CORRECTED_FIREBASE_JSON.txt`
   - Make sure it's ALL on ONE line
   - Make sure it includes `"project_id": "dvashschoolweb"`

2. **In Vercel:**
   - Settings → Environment Variables
   - Edit `FIREBASE_SERVICE_ACCOUNT`
   - **Delete everything** and paste the corrected JSON
   - **Verify** it includes `project_id` field
   - Save

3. **Redeploy:**
   - Deployments → Latest → "..." → Redeploy
   - Wait for deployment to complete

### Step 4: Verify IAM Permissions

Even with correct JSON, you need permissions:

1. **Go to:** https://console.cloud.google.com/iam-admin/iam?project=dvashschoolweb

2. **Find:** `firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com`

3. **Check roles** - Must have:
   - ✅ `Firebase Admin SDK Administrator Service Agent` (preferred)
   - OR `Cloud Datastore User`
   - OR `Cloud Firestore User`

4. **If missing:**
   - Click pencil icon → "ADD ANOTHER ROLE"
   - Select `Firebase Admin SDK Administrator Service Agent`
   - Save
   - Wait 1-2 minutes

### Step 5: Test Again

After updating:
1. **Redeploy** (if you changed env vars)
2. **Wait 1-2 minutes** (if you changed IAM)
3. **Try publishing** again
4. **Check logs** - Look for the diagnostic messages

## What to Share

If it still doesn't work, share:
1. **Vercel function logs** (especially the diagnostic messages)
2. **What `project_id` shows** in the logs
3. **Whether you see** "Firebase Admin initialized successfully"

The logs will tell us exactly what's wrong!
