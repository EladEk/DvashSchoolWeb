# Admin Panel Guide

## Accessing the Admin Panel

1. Navigate to `/admin` in your browser
2. Login with:
   - **Username:** `admin`
   - **Password:** `Panda123`

## Features

### Translation Editor

The admin dashboard allows you to:
- Edit all translation texts for both Hebrew and English
- Switch between languages using the language selector
- See all changes in real-time
- Save changes to Firebase (when configured) or localStorage
- Export updated JSON files for manual git commit

### How to Edit Translations

1. **Select Language**: Click on "Hebrew (עברית)" or "English" to switch between languages
2. **Edit Text**: Click on any text field and modify the content
3. **Save Changes**: Click "Save to Firebase" button to save your changes
4. **Export Files**: Click "Export JSON Files" to download updated `he.json` and `en.json` files

### Saving Changes

When you click "Save to Firebase":
- Changes are saved to Firebase Firestore (if configured)
- Changes are also saved to localStorage as backup
- The website immediately uses the updated translations
- You'll see a success message confirming the save

### Exporting for Git

To commit changes to git:

1. Click "Export JSON Files" button
2. Two files will download: `he.json` and `en.json`
3. Replace the files in `src/translations/` with the downloaded files
4. Commit and push to git:
   ```bash
   git add src/translations/he.json src/translations/en.json
   git commit -m "Update translations from admin panel"
   git push
   ```

## Firebase Integration

### Current Setup

Currently, translations are stored in:
- **localStorage** (temporary storage, works immediately)
- **Firebase Firestore** (when configured - see below)

### Configuring Firebase

1. Follow the instructions in `FIREBASE_SETUP.md` to configure Firebase
2. Once Firebase is configured, translations will automatically:
   - Load from Firebase first
   - Fall back to localStorage if Firebase is unavailable
   - Fall back to JSON files if both are unavailable

### Firebase Firestore Structure

Translations are stored in Firestore as:
- Collection: `translations`
- Documents: `he` (Hebrew) and `en` (English)
- Each document contains the full translation object

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change Default Credentials**: The default admin credentials are hardcoded. For production:
   - Implement proper authentication (Firebase Auth)
   - Use environment variables for credentials
   - Add rate limiting and session management

2. **Protect Admin Routes**: Currently protected by sessionStorage. For production:
   - Use server-side authentication
   - Implement proper session management
   - Add CSRF protection

3. **Firebase Security Rules**: Set up proper Firestore security rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /translations/{lang} {
         allow read: if true; // Public read
         allow write: if request.auth != null && request.auth.token.admin == true;
       }
     }
   }
   ```

## Troubleshooting

### Translations Not Updating

1. Check if changes were saved (look for success message)
2. Refresh the page to reload translations
3. Check browser console for errors
4. Verify Firebase configuration if using Firebase

### Export Not Working

1. Check browser download settings
2. Ensure pop-ups are not blocked
3. Check browser console for errors

### Can't Access Admin Panel

1. Clear sessionStorage: `sessionStorage.clear()`
2. Try logging in again
3. Check browser console for errors

## Future Enhancements

Potential improvements:
- [ ] Firebase Authentication integration
- [ ] Version history for translations
- [ ] Translation validation
- [ ] Bulk import/export
- [ ] Translation search and filter
- [ ] User roles and permissions
- [ ] Audit log of changes
