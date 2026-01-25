# Local Testing Guide

## Quick Start

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Test text loading:**
   - Open your browser to `http://localhost:5173`
   - The site should load texts from `/content/texts.json`
   - Check browser console for any errors

3. **Test edit mode:**
   - Log in as admin/editor
   - Activate admin mode (check sessionStorage)
   - Make changes in Admin Dashboard
   - Click "Save to Firebase"

4. **Test publishing (local):**
   - Use the local test endpoint (see below)
   - Or modify `textService.js` temporarily to use local endpoint

## Testing the Publish Functionality Locally

### Option 1: Use Local Mock API (Recommended)

1. **Temporarily update `vercel.json`** to use the local endpoint:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/publish-texts",
         "destination": "/api/publish-texts-local.js"
       }
     ]
   }
   ```

2. **Or modify `src/services/textService.js`** temporarily:
   ```javascript
   // Change this line in publishTexts function:
   const response = await fetch('/api/publish-texts-local', {
   ```

3. **Test the publish:**
   - Enter edit mode
   - Make changes
   - Click "Publish to GitHub"
   - Check that `public/content/texts.json` and `content/texts.json` are updated

### Option 2: Test with Real GitHub (Use Test Branch)

1. **Create a test branch in GitHub:**
   ```bash
   git checkout -b test-publish
   git push -u origin test-publish
   ```

2. **Update environment variables** to use test branch:
   ```
   GITHUB_REPO=DvashSchoolWeb
   GITHUB_FILE_PATH=content/test-texts.json  # Use different file for testing
   ```

3. **Test publish** - it will update the test file instead

### Option 3: Manual Test Script

Run the test script:
```bash
node test-publish.js
```

This will:
- Load texts from `content/texts.json`
- Check for Parliament keys
- Exclude Parliament data
- Save to both `public/content/texts.json` and `content/texts.json`

## What to Test

### ✅ Text Loading
- [ ] Production mode loads from `/content/texts.json`
- [ ] Edit mode loads from Firebase
- [ ] Parliament keys are excluded in both modes
- [ ] Fallback to defaults if file missing

### ✅ Text Saving
- [ ] Can save in edit mode only
- [ ] Parliament keys are blocked from saving
- [ ] Changes persist in Firebase

### ✅ Publishing
- [ ] Fetches from Firebase correctly
- [ ] Excludes Parliament data
- [ ] Updates local files (in test mode)
- [ ] Creates proper JSON format
- [ ] Handles errors gracefully

### ✅ Parliament Exclusion
- [ ] No Parliament keys in `texts.json`
- [ ] Parliament page still works independently
- [ ] Exclusion works at all levels (nested objects)

## Troubleshooting

### "Failed to load texts.json"
- Check that `public/content/texts.json` exists
- Check browser console for 404 errors
- Verify file path in `textService.js`

### "Cannot save translations outside of edit mode"
- Check `sessionStorage.getItem('adminAuthenticated') === 'true'`
- Activate admin mode first

### "Parliament texts appearing"
- Check exclusion logic in `textService.js`
- Verify `excludeParliament` function is working
- Check that Parliament keys don't exist in `texts.json`

## Before Pushing to GitHub

1. ✅ Test all functionality locally
2. ✅ Verify Parliament exclusion works
3. ✅ Test with real Firebase data
4. ✅ Check that `content/texts.json` is correct
5. ✅ Remove any test/debug code
6. ✅ Revert `vercel.json` if you changed it for testing
