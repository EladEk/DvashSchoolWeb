# Create Fine-Grained GitHub Token for Single Repository

## Step 1: Create Fine-Grained Token

1. **Go to:** https://github.com/settings/tokens?type=beta

2. **Click "Generate new token" → "Generate new token (fine-grained)"**

3. **Token name:** e.g., "SchoolWebsite-Publish-DvashSchoolWeb"

4. **Expiration:** Choose "No expiration" or set a long expiration

5. **Repository access:**
   - Select **"Only select repositories"**
   - Search for and select: **`EladEk/DvashSchoolWeb`**
   - Click "Select repositories"

6. **Repository permissions:**
   - Under "Repository permissions", expand **"Contents"**
   - Set to **"Read and write"** (needed to update files)
   
   - Under "Metadata", make sure it's set to **"Read-only"** (this is usually default)

7. **Account permissions:** Leave as default (no account permissions needed)

8. **Click "Generate token"**

9. **Copy the token immediately** (starts with `github_pat_`)

## Step 2: Update Vercel Environment Variable

1. **In Vercel:**
   - Settings → Environment Variables
   - Find `GITHUB_TOKEN`
   - Click "Edit"
   - **Delete the old token**
   - **Paste the new fine-grained token** (starts with `github_pat_`)
   - Click "Save"

## Step 3: Update Code (if needed)

The code already handles fine-grained tokens (they use `Bearer` instead of `token`). Fine-grained tokens start with `github_pat_` and the code will automatically use the correct format.

## Step 4: Redeploy

1. **Go to Deployments**
2. **Click "..." on latest deployment**
3. **Click "Redeploy"**
4. **Wait for deployment to complete**

## Step 5: Test

Try publishing again. The token will only have access to the `DvashSchoolWeb` repository.

## Security Benefits

✅ **More secure** - Token can only access one repository
✅ **Limited scope** - Can't access other repos even if compromised
✅ **Easy to revoke** - Can revoke without affecting other tokens

## Token Format

- **Classic tokens:** Start with `ghp_` → Use `token` header
- **Fine-grained tokens:** Start with `github_pat_` → Use `Bearer` header

The code automatically detects which format to use!
