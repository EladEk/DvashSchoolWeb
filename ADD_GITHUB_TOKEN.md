# Add GitHub Token to Vercel

## Step 1: Add Token to Vercel

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select your project

2. **Go to Settings → Environment Variables**

3. **Find or create `GITHUB_TOKEN`:**
   - If it exists: Click "Edit"
   - If it doesn't exist: Click "Add New"
   - Name: `GITHUB_TOKEN`
   - Value: `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`
   - Environment: Select **"Production"** (and "Preview" if you want)
   - Click "Save"

## Step 2: Verify Other GitHub Variables

Make sure these are also set:
- `GITHUB_OWNER` = `EladEk`
- `GITHUB_REPO` = `DvashSchoolWeb`
- `GITHUB_FILE_PATH` = `content/texts.json`

## Step 3: Redeploy

1. **Go to Deployments**
2. **Click "..." on latest deployment**
3. **Click "Redeploy"**
4. **Wait for deployment to complete**

## Step 4: Test

Try publishing texts again. It should work now! ✅

## Security Note

✅ This is a fine-grained token (more secure)
✅ It's scoped to only one repository
✅ The code automatically uses `Bearer` header for fine-grained tokens

The token is now configured correctly!
