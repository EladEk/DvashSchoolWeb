# Make Production Mode Match Edit Mode (1:1)

## Current Situation
- ✅ Edit mode: Loads from Firebase → Shows sections correctly
- ❌ Production mode: Loads from GitHub `texts.json` → Missing sections

## Root Cause
The `sections` array exists in Firebase but wasn't included in the last published `texts.json` file.

## Solution: Publish Again

The publish process fetches **everything** from Firebase (including `sections`) and excludes only Parliament. You just need to publish again to sync the latest data:

### Step 1: Verify Sections Exist in Firebase
1. Go to Firebase Console: https://console.firebase.google.com/project/dvashschoolweb/firestore/data
2. Open `translations` collection
3. Check `he` document → Should have `sections` field (array)
4. Check `en` document → Should have `sections` field (array)

### Step 2: Publish to GitHub
1. **Go to Admin Dashboard** (in edit mode)
2. **Click "Publish to GitHub"**
3. **Wait for success message**

### Step 3: Verify What Was Published
After publishing, check the Vercel function logs:
- Look for: `"Has sections in he: true"`
- Look for: `"Has sections after exclusion in he: true"`
- Look for: `"Sections count in he: X"`

### Step 4: Check GitHub File
1. Go to: https://github.com/EladEk/DvashSchoolWeb/blob/main/content/texts.json
2. Search for `"sections"` - should exist
3. Should be an array with your sections

### Step 5: Clear Cache and Test
1. **Hard refresh** the production site (Ctrl+F5 or Cmd+Shift+R)
2. **Check main page** - sections should now appear

## How It Works

**Edit Mode:**
```
Firebase → textService.loadFromFirebase() → TranslationContext → Components
```

**Production Mode:**
```
GitHub (texts.json) → textService.loadFromProduction() → TranslationContext → Components
```

**Publish Process:**
```
Firebase → excludeParliament() → GitHub (texts.json)
```

The publish process ensures production mode is **1:1** with edit mode (except Parliament).

## If Sections Still Don't Appear

1. **Check browser console** for errors loading `texts.json`
2. **Check Network tab** - is `/content/texts.json` loading successfully?
3. **Verify file path** - should be `/content/texts.json` (served from `public/content/`)
4. **Check Vercel logs** - what does the publish log show?

The enhanced logging will show exactly what's being published!
