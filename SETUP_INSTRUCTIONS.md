# Setup Instructions

## Prerequisites

1. **GitHub Personal Access Token**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   - Copy the token (starts with `ghp_`)

2. **Firebase Service Account**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Copy the entire JSON content

## Vercel Environment Variables

Add these environment variables in Vercel Dashboard:

### Required Variables

```bash
# GitHub Configuration
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=SchoolWebsite
GITHUB_FILE_PATH=content/texts.json

# Firebase Admin (paste entire JSON from service account file)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### Optional Variables (with defaults)

- `GITHUB_OWNER` - defaults to `your-username`
- `GITHUB_REPO` - defaults to `SchoolWebsite`
- `GITHUB_FILE_PATH` - defaults to `content/texts.json`

## Install Dependencies

```bash
npm install firebase-admin
```

## Initial Setup

1. **Create `content/texts.json`** in your repository
   - Copy the example from `content/texts.json` in this repo
   - Commit and push to GitHub

2. **Test the API route locally** (optional)
   ```bash
   # Use Vercel CLI or test after deployment
   vercel dev
   ```

3. **Deploy to Vercel**
   - Push your changes to GitHub
   - Vercel will automatically deploy
   - Ensure environment variables are set in Vercel dashboard

## Testing

1. **Enter Edit Mode**
   - Log in as admin/editor
   - Activate admin mode (sessionStorage)

2. **Make Changes**
   - Edit translations in Admin Dashboard
   - Click "Save to Firebase"

3. **Publish**
   - Click "Publish to GitHub" button
   - Enter commit message
   - Verify commit appears in GitHub

4. **Verify Production**
   - Exit edit mode
   - Refresh page
   - Verify texts are loaded from `content/texts.json`

## Troubleshooting

### "GITHUB_TOKEN environment variable is not set"
- Check Vercel environment variables
- Ensure token has `repo` scope

### "FIREBASE_SERVICE_ACCOUNT environment variable is not set"
- Copy entire JSON from Firebase service account file
- Paste as single-line JSON in Vercel

### "Failed to update GitHub file"
- Check repository name and owner
- Verify file path is correct
- Ensure token has write access

### Parliament texts appearing
- This should never happen
- Check exclusion logic in `textService.js`
- Verify Parliament keys are filtered out
