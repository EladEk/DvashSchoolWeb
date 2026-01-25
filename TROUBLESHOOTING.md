# Troubleshooting Guide - 500 Error on Publish

## Common Issues and Solutions

### 1. Missing Environment Variables

**Error:** "Server configuration error" or "GITHUB_TOKEN is not set"

**Solution:**
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Verify these are set:
  - `GITHUB_TOKEN` - Your GitHub token
  - `GITHUB_OWNER` - EladEk
  - `GITHUB_REPO` - DvashSchoolWeb
  - `GITHUB_FILE_PATH` - content/texts.json
  - `FIREBASE_SERVICE_ACCOUNT` - Your Firebase service account JSON

### 2. Firebase Service Account Not Set

**Error:** "Firebase configuration error" or "FIREBASE_SERVICE_ACCOUNT is not set"

**Solution:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content (as a single line)
5. Paste it into Vercel environment variable `FIREBASE_SERVICE_ACCOUNT`

### 3. GitHub Token Issues

**Error:** "Failed to update GitHub file" with 401 or 403

**Possible causes:**
- Token expired or invalid
- Token doesn't have `repo` scope
- Token format incorrect

**Solution:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Verify token has `repo` scope checked
3. If using fine-grained token, ensure it has repository access
4. Regenerate token if needed
5. Update in Vercel environment variables

### 4. Repository Not Found (404)

**Error:** "Failed to get file SHA from GitHub" or 404 error

**Solution:**
- Verify `GITHUB_OWNER` is correct (EladEk)
- Verify `GITHUB_REPO` is correct (DvashSchoolWeb)
- Verify `GITHUB_FILE_PATH` is correct (content/texts.json)
- Ensure the repository exists and is accessible
- Check that `content/texts.json` exists in the repository

### 5. Wrong Default Branch

**Error:** File updates but commit fails

**Solution:**
- Check your repository's default branch (main or master)
- Update line 246 in `api/publish-texts.js`:
  ```javascript
  branch: 'main' // Change to 'master' if needed
  ```

### 6. Firebase Admin SDK Not Installed

**Error:** "Cannot find module 'firebase-admin'"

**Solution:**
```bash
npm install firebase-admin
git add package.json package-lock.json
git commit -m "Add firebase-admin"
git push
```

### 7. Check Vercel Function Logs

**To see detailed error messages:**

1. Go to Vercel Dashboard → Your Project → Functions
2. Click on the function that failed
3. Check the logs for detailed error messages
4. Look for:
   - Environment variable issues
   - Firebase initialization errors
   - GitHub API errors
   - Network errors

## Testing Steps

1. **Test Environment Variables:**
   - Check Vercel dashboard for all required variables
   - Verify they're set for Production environment

2. **Test GitHub Token:**
   ```bash
   curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
   ```
   Should return your user info

3. **Test Repository Access:**
   ```bash
   curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/repos/EladEk/DvashSchoolWeb
   ```
   Should return repository info

4. **Test Firebase:**
   - Verify Firebase service account JSON is valid
   - Check Firebase project ID matches

## Quick Fix Checklist

- [ ] All environment variables set in Vercel
- [ ] GitHub token has `repo` scope
- [ ] Firebase service account JSON is valid
- [ ] Repository name and owner are correct
- [ ] `content/texts.json` exists in repository
- [ ] Default branch is correct (main/master)
- [ ] `firebase-admin` is installed
- [ ] Vercel deployment is up to date

## Still Having Issues?

1. Check Vercel function logs for the exact error
2. Test the GitHub API directly with curl
3. Verify Firebase Admin SDK can connect
4. Check that the file path is correct
5. Ensure the repository is not private (or token has access)
