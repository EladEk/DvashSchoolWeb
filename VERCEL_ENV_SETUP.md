# Vercel Environment Variable Setup

## FIREBASE_SERVICE_ACCOUNT

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content as a single line
5. Paste it into Vercel as the value for `FIREBASE_SERVICE_ACCOUNT`

**Important:** The JSON must be a single-line string (no line breaks). Example format:
```
{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
```

## Complete Vercel Environment Variables Checklist

Make sure you have ALL of these set in Vercel:

1. **GITHUB_TOKEN** = `your_github_personal_access_token_here`
   - Get from: GitHub → Settings → Developer settings → Personal access tokens
   - Must have `repo` scope

2. **GITHUB_OWNER** = `EladEk`

3. **GITHUB_REPO** = `DvashSchoolWeb`

4. **GITHUB_FILE_PATH** = `content/texts.json`

5. **FIREBASE_SERVICE_ACCOUNT** = (paste the JSON above)

## Steps to Add in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Click "Add New"
3. For each variable:
   - Enter the **Key** (e.g., `GITHUB_TOKEN`)
   - Paste the **Value** 
   - Select environments (Production, Preview, Development)
   - Click "Save"
4. **Important:** After adding FIREBASE_SERVICE_ACCOUNT, redeploy your project

## After Setting Variables:

1. Install firebase-admin locally:
   ```bash
   npm install firebase-admin
   ```

2. Commit and push:
   ```bash
   git add package.json package-lock.json
   git commit -m "Add firebase-admin dependency"
   git push
   ```

3. Vercel will automatically redeploy and install firebase-admin

4. Try publishing again!
