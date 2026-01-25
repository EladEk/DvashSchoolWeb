# Fix Firebase Authentication Error

## Problem
Error: `UNAUTHENTICATED: Request had invalid authentication credentials`

This usually means the `FIREBASE_SERVICE_ACCOUNT` JSON is not formatted correctly in Vercel.

## Solution

### Step 1: Get Fresh Service Account JSON

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" (or regenerate if needed)
3. Download the JSON file

### Step 2: Format for Vercel

The JSON must be a **single-line string** with `\n` preserved in the private key.

**Option A: Use a JSON minifier** (Recommended)
1. Go to https://jsonformatter.org/json-minify
2. Paste your JSON file content
3. Click "Minify"
4. Copy the result (single line)
5. Paste into Vercel

**Option B: Manual formatting**
1. Open the JSON file in a text editor
2. Remove all line breaks EXCEPT inside the `private_key` value
3. The `private_key` should have `\n` (backslash + n) characters, not actual newlines
4. Example: `"private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`

### Step 3: Verify in Vercel

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Edit `FIREBASE_SERVICE_ACCOUNT`
3. Make sure it's all on one line
4. The private_key should have `\n` characters (not actual line breaks)
5. Save and redeploy

### Step 4: Test

After redeploying, try publishing again. Check Vercel function logs if it still fails.

## Common Issues

- **Actual newlines in private_key**: Should be `\n` (backslash + n), not real line breaks
- **Extra spaces**: Remove any spaces before/after the JSON
- **Double escaping**: Make sure `\n` is not escaped as `\\n`
- **Missing fields**: Ensure all required fields are present (type, project_id, private_key, client_email, etc.)

## Verify JSON Format

Your JSON should look like this (all on one line):
```
{"type":"service_account","project_id":"dvashschoolweb","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-...@dvashschoolweb.iam.gserviceaccount.com",...}
```

The key is that `\n` in the private_key should be the literal characters backslash + n, not actual newlines.
