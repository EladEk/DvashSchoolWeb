# Fix: Images Not Loading in Production Mode

## Problem
Images work in edit mode (authenticated) but not in production mode (unauthenticated).

## Root Cause
Firestore security rules likely require authentication to read images, but production mode users are not authenticated.

## Solution: Update Firestore Security Rules

### Step 1: Go to Firebase Console
1. Go to: https://console.firebase.google.com/project/dvashschoolweb/firestore/rules

### Step 2: Update Rules for Images Collection

Make sure images are readable by **everyone** (including unauthenticated users):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Images - MUST be readable by all (including unauthenticated users)
    match /images/{imageKey} {
      allow read: if true;  // ✅ Everyone can read (required for production mode)
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Translations - readable by all
    match /translations/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Parliament collections - readable by authenticated users
    match /parliamentDates/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'committee');
    }
    
    match /parliamentSubjects/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /parliamentNotes/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Users - readable/writable by admins only
    match /users/{userId} {
      allow read: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Contacts - readable by admins, writable by all (for contact form)
    match /contacts/{contactId} {
      allow read: if request.auth != null && 
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if true; // Anyone can submit contact form
    }
  }
}
```

### Step 3: Publish Rules
1. Click **"Publish"** button
2. Wait for rules to deploy (usually instant)

### Step 4: Test
1. **Open production site** (not logged in)
2. **Check browser console** (F12)
3. **Look for:**
   - `[EditableImage] Loading image for key: hero.image`
   - `[firebaseDB] Found image path for hero.image: /path/to/image.jpg`
4. **Images should now load!**

## Why This Happens

**Edit Mode:**
- User is authenticated (logged in as admin)
- Firestore rules allow authenticated reads
- Images load ✅

**Production Mode:**
- User is NOT authenticated (public visitor)
- If rules require `request.auth != null`, reads are blocked
- Images don't load ❌

**Solution:**
- Images must have `allow read: if true` (public reads)
- This allows unauthenticated users to see images

## Verify Images Exist

If images still don't load after fixing rules:

1. **Check Firebase Console:**
   - Firestore → `images` collection
   - Should have documents like `hero.image`, `section.image1`, etc.

2. **If missing:**
   - Go to Admin Dashboard (edit mode)
   - Upload images via image editor
   - They'll be saved to Firebase

## Enhanced Logging

The code now logs:
- When images are being loaded
- What Firebase returns
- Any errors

Check browser console to see exactly what's happening!
