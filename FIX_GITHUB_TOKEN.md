# Fix GitHub Authentication Error

## ✅ Great News!
Firebase is working now! The new service account key fixed the Firebase authentication issue.

## Current Issue
GitHub API is returning `401 Bad credentials` - this means the GitHub token is invalid or expired.

## Solution: Update GitHub Token

### Step 1: Generate New GitHub Token

1. **Go to:** https://github.com/settings/tokens

2. **Click "Generate new token" → "Generate new token (classic)"**

3. **Give it a name:** e.g., "SchoolWebsite-Publish"

4. **Set expiration:** Choose "No expiration" or a long expiration

5. **Select scopes:**
   - ✅ **`repo`** (Full control of private repositories) - REQUIRED
   - ✅ **`workflow`** (if you use GitHub Actions)
   
   **Minimum required:** `repo` scope

6. **Click "Generate token"**

7. **Copy the token immediately** (you won't see it again!)

### Step 2: Update Vercel Environment Variable

1. **In Vercel:**
   - Go to your project
   - Settings → Environment Variables
   - Find `GITHUB_TOKEN`
   - Click "Edit"
   - **Delete the old token**
   - **Paste the new token**
   - Click "Save"

### Step 3: Verify Other GitHub Variables

Make sure these are set correctly:
- `GITHUB_TOKEN` - Your new token
- `GITHUB_OWNER` - Should be `EladEk`
- `GITHUB_REPO` - Should be `DvashSchoolWeb`
- `GITHUB_FILE_PATH` - Should be `content/texts.json`

### Step 4: Redeploy

1. **Go to Deployments**
2. **Click "..." on latest deployment**
3. **Click "Redeploy"**
4. **Wait for deployment to complete**

### Step 5: Test Again

Try publishing again. It should work now! 🎉

## Why This Happened

GitHub tokens can expire or become invalid if:
- Token was revoked
- Token expired
- Token doesn't have the right scopes
- Token was regenerated

The new token with `repo` scope should fix it!
