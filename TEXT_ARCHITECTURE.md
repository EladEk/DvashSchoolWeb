# Text Management Architecture

## Overview

This document describes the dual-source text management architecture for the School Website.

## Architecture

### Production Mode (Default)
- **Source**: `/content/texts.json` (stored in GitHub repository)
- **Behavior**: Website reads all texts from the local JSON file
- **Performance**: Fast, cached, no external dependencies
- **Parliament Exclusion**: Parliament-related translations are automatically excluded

### Edit Mode (Admin Mode)
- **Source**: Firebase Firestore (`translations` collection)
- **Behavior**: Website reads and writes texts from Firebase (drafts)
- **Access**: Only when `sessionStorage.getItem('adminAuthenticated') === 'true'`
- **Parliament Exclusion**: Parliament-related translations are automatically excluded

### Publish Flow
1. Editor makes changes in Firebase (edit mode)
2. Editor clicks "Publish to GitHub" button
3. Vercel API route (`/api/publish-texts`) is called:
   - Fetches latest texts from Firebase
   - Excludes Parliament-related data
   - Formats as JSON
   - Updates `content/texts.json` in GitHub via REST API
   - Creates a commit with clear message
4. Production site automatically uses updated texts from GitHub

## Important: Parliament Page Exclusion

**The Parliament page is completely excluded from this system.**

- Parliament translations are **never** loaded from `texts.json`
- Parliament translations are **never** loaded from Firebase through this system
- Parliament translations are **never** included in publish operations
- The Parliament page manages its own content independently

The exclusion is enforced at multiple levels:
1. `textService.js` filters out any keys containing "parliament"
2. `publish-texts.js` API route excludes Parliament data before publishing
3. All text loading functions explicitly skip Parliament keys

## File Structure

```
├── api/
│   └── publish-texts.js          # Vercel serverless function for GitHub publishing
├── content/
│   └── texts.json                 # Production source of truth (GitHub)
├── src/
│   ├── services/
│   │   ├── textService.js         # Main text loading/saving service
│   │   ├── adminService.js        # Backward compatibility wrapper
│   │   └── firebaseDB.js          # Firebase operations (existing)
│   └── contexts/
│       └── TranslationContext.jsx # Updated to use textService
└── src/translations/
    ├── he.json                    # Default fallback (Parliament excluded)
    └── en.json                    # Default fallback (Parliament excluded)
```

## Environment Variables

Required in Vercel:

```bash
# GitHub Configuration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx  # GitHub Personal Access Token with repo scope
GITHUB_OWNER=your-username      # GitHub username or organization
GITHUB_REPO=SchoolWebsite      # Repository name
GITHUB_FILE_PATH=content/texts.json  # Path to texts.json in repo

# Firebase Admin (for server-side operations)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  # Firebase service account JSON
```

## Security Considerations

1. **GitHub Token**: Stored in environment variables, never exposed to client
2. **Firebase Auth**: API route should verify Firebase Auth tokens (TODO: implement)
3. **Edit Mode Check**: Client-side check prevents unauthorized saves
4. **Parliament Exclusion**: Multiple layers ensure Parliament data is never touched

## API Endpoints

### POST `/api/publish-texts`

Publishes texts from Firebase to GitHub.

**Request:**
```json
{
  "commitMessage": "Update site texts - 2024-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Texts published successfully",
  "commit": {
    "sha": "abc123...",
    "message": "Update site texts - 2024-01-01",
    "url": "https://github.com/owner/repo/commit/abc123"
  },
  "file": {
    "path": "content/texts.json",
    "sha": "def456...",
    "url": "https://github.com/owner/repo/blob/main/content/texts.json"
  }
}
```

## Usage Examples

### Loading Texts (Automatic)
```javascript
import { useTranslation } from '../contexts/TranslationContext'

function MyComponent() {
  const { t } = useTranslation()
  return <h1>{t('hero.title')}</h1>
}
```

### Saving Texts (Edit Mode Only)
```javascript
import { saveTexts, isEditMode } from '../services/textService'

if (isEditMode()) {
  await saveTexts({ he: {...}, en: {...} })
}
```

### Publishing to GitHub (Edit Mode Only)
```javascript
import { publishTexts } from '../services/textService'

if (isEditMode()) {
  await publishTexts('Update site texts')
}
```

## Migration Notes

1. **Existing Code**: All existing code continues to work via `adminService.js` wrapper
2. **TranslationContext**: Automatically uses new system, no changes needed
3. **Admin Dashboard**: Works as before, with added "Publish to GitHub" button
4. **Parliament Page**: Unaffected, continues to use Firebase directly

## Best Practices

1. **Always test in edit mode** before publishing
2. **Use descriptive commit messages** when publishing
3. **Verify Parliament exclusion** - Parliament keys should never appear in `texts.json`
4. **Monitor GitHub commits** to ensure publishes are working correctly
5. **Keep Firebase drafts** - They serve as backup and edit history

## Troubleshooting

### Texts not updating in production
- Check that `content/texts.json` exists in GitHub
- Verify the file path in environment variables
- Check Vercel function logs for errors

### Publish fails
- Verify `GITHUB_TOKEN` has `repo` scope
- Check that `GITHUB_OWNER` and `GITHUB_REPO` are correct
- Ensure Firebase Admin SDK is configured correctly

### Parliament texts appearing in production
- This should never happen - check exclusion logic
- Verify `textService.js` is filtering correctly
- Check that Parliament keys don't exist in `texts.json`
