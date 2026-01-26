# Updated Architecture: Production Mode Loads Parliament from Firebase

## New Architecture

### Production Mode (Normal Users)
```
GitHub (texts.json) → Exclude Parliament → Merge with Parliament from Firebase → Final translations
```

**Flow:**
1. Load from `/content/texts.json` (GitHub)
2. Exclude Parliament data from GitHub
3. Load Parliament translations from Firebase
4. Merge Parliament from Firebase with GitHub data
5. Return merged result

### Edit Mode (Admin)
```
Firebase → Everything (including Parliament) → Final translations
```

**Flow:**
1. Load everything from Firebase (including Parliament)
2. Return as-is

## What Changed

### Before:
- Production: Only GitHub (no Parliament)
- Edit: Firebase excluding Parliament

### After:
- Production: GitHub + Parliament from Firebase
- Edit: Firebase (everything including Parliament)

## Benefits

✅ **Production mode**: Gets latest Parliament translations from Firebase
✅ **Edit mode**: Can edit Parliament translations in Firebase
✅ **Publish process**: Still excludes Parliament from GitHub (as designed)
✅ **Separation**: Parliament stays in Firebase, rest goes to GitHub

## How It Works

1. **Production Mode:**
   - Main texts: From GitHub (`/content/texts.json`)
   - Parliament texts: From Firebase (merged in)
   - Result: Complete translations with latest Parliament data

2. **Edit Mode:**
   - Everything: From Firebase
   - Can edit: All texts including Parliament
   - Result: Full editing capability

3. **Publish:**
   - Fetches: Everything from Firebase
   - Excludes: Parliament
   - Saves: To GitHub (without Parliament)
   - Result: GitHub has everything except Parliament

## Testing

1. **In production mode:**
   - Check main page → Should load from GitHub
   - Check Parliament page → Should load Parliament from Firebase
   - Verify Parliament translations are from Firebase

2. **In edit mode:**
   - Check main page → Should load from Firebase
   - Check Parliament page → Should load from Firebase
   - Can edit Parliament translations

The system now works exactly as requested!
