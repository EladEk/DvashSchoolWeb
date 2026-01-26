# Fix: Missing Sections on Main Page

## Problem
The main page shows sections in edit mode (from Firebase) but not in production mode (from `texts.json`).

## Root Cause
The `sections` array exists in Firebase but wasn't included in the published `texts.json` file.

## Solution

### Option 1: Publish Again (Recommended)
If `sections` exist in Firebase, publish again to include them:

1. **Go to Admin Dashboard**
2. **Click "Publish to GitHub"**
3. **Wait for it to complete**
4. **Refresh the production site**

The `sections` array should now be in `texts.json`.

### Option 2: Check Firebase
Verify `sections` exist in Firebase:

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/dvashschoolweb/firestore/data

2. **Check `translations` collection:**
   - Open `he` document
   - Look for `sections` field (should be an array)
   - Open `en` document
   - Look for `sections` field

3. **If sections don't exist:**
   - Go to admin dashboard in edit mode
   - Add sections using the "+ הוסף סעיף" button
   - Save to Firebase
   - Then publish

### Option 3: Manual Check
Check what's in `content/texts.json`:
- Open `content/texts.json`
- Look for `"sections"` key
- If missing, sections weren't published

## Expected Structure
The `sections` array should look like:
```json
{
  "he": {
    "sections": [
      {
        "title": "כותרת",
        "text": "טקסט",
        "imageKey": "image.key",
        "position": 0
      }
    ]
  },
  "en": {
    "sections": [...]
  }
}
```

## Quick Fix
1. **Make sure you're in edit mode**
2. **Go to main page** - you should see sections
3. **Click "Publish to GitHub"**
4. **Check `content/texts.json`** - should now have `sections`
5. **Refresh production site** - sections should appear
