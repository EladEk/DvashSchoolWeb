# Debugging Firebase Authentication Error

## Current Status
You're getting `UNAUTHENTICATED` error when trying to fetch from Firestore. This could be:
1. **Private key format issue** (most likely)
2. **Missing IAM permissions** (second most likely)
3. **Firestore API not enabled**

## Step 1: Check Vercel Function Logs

The updated code now includes detailed diagnostic logging. Check your Vercel logs:

1. Go to: https://vercel.com/dashboard
2. Select your project: `dvashschoolweb` (or similar)
3. Go to **Deployments** → Click on the latest deployment
4. Go to **Functions** tab → Click on `publish-texts`
5. Look for logs that show:
   - `Private key preview (first 50 chars):`
   - `Private key contains \n (literal):`
   - `Private key contains actual newlines:`
   - `Firebase Admin initialized successfully`
   - `Attempting to fetch translations from Firestore...`

**What to look for:**
- If `Private key contains \n (literal): true` → The key still has literal `\n` strings (needs fixing)
- If `Private key contains actual newlines: false` → The replacement didn't work
- If you see `WARNING: Private key does not start with expected header` → The key is corrupted

## Step 2: Verify Environment Variable Format

The `FIREBASE_SERVICE_ACCOUNT` in Vercel must be:
- ✅ **Single line** (no line breaks)
- ✅ **Valid JSON**
- ✅ **Private key uses `\n`** (single backslash, not `\\n`)

**To verify:**
1. Copy the value from Vercel
2. Try parsing it: `JSON.parse(yourCopiedValue)`
3. Check `private_key` field - it should have actual newlines when printed

## Step 3: Fix the Environment Variable

If the logs show the private key still has literal `\n`:

1. **Copy the corrected JSON** from `CORRECTED_FIREBASE_JSON.txt`
2. **In Vercel:**
   - Settings → Environment Variables
   - Edit `FIREBASE_SERVICE_ACCOUNT`
   - **Delete everything** and paste the corrected single-line JSON
   - Save
3. **Redeploy:**
   - Deployments → Latest → "..." → Redeploy

## Step 4: Verify Service Account Permissions

Even if the key format is correct, you need IAM permissions:

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/iam-admin/iam?project=dvashschoolweb

2. **Find service account:**
   `firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com`

3. **Check roles** - Should have at least one of:
   - ✅ `Firebase Admin SDK Administrator Service Agent` (preferred)
   - ✅ `Cloud Datastore User`
   - ✅ `Cloud Firestore User`

4. **If missing, add role:**
   - Click pencil icon (Edit)
   - "ADD ANOTHER ROLE"
   - Select `Firebase Admin SDK Administrator Service Agent`
   - Save
   - Wait 1-2 minutes for propagation

## Step 5: Verify Firestore API is Enabled

1. Go to: https://console.cloud.google.com/apis/library?project=dvashschoolweb
2. Search: "Cloud Firestore API"
3. Should show **Enabled**
4. If not, click "Enable"

## Step 6: Test Again

After making changes:
1. **Redeploy** on Vercel (if you changed env vars)
2. **Wait 1-2 minutes** (if you changed IAM permissions)
3. **Try publishing** again
4. **Check logs** for the diagnostic output

## What the Logs Will Tell You

The enhanced logging will show:
- ✅ If Firebase Admin initializes successfully
- ✅ What format the private key is in
- ✅ Whether newline replacement worked
- ✅ The exact error code and message from Firebase
- ✅ Whether it's an authentication or permission issue

**Share the Vercel function logs** if you need more help diagnosing the issue.
