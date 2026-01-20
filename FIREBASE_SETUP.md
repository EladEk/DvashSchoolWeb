# Firebase Setup Guide

This project is prepared to use Firebase for contact form submissions and FAQ management.

## Installation

Firebase SDK is already included in `package.json`. Install dependencies:

```bash
npm install
```

## Configuration Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Enable Firestore Database

1. In Firebase Console, go to "Build" > "Firestore Database"
2. Click "Create database"
3. Start in **test mode** (for development) or **production mode** (with security rules)
4. Choose a location for your database

### 3. Get Your Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register your app and copy the configuration object

### 4. Update Firebase Configuration

Open `src/services/firebase.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

### 5. Uncomment Firebase Initialization

In `src/services/firebase.js`, uncomment these lines:

```javascript
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
```

### 6. Update Contact Form Submission

In `src/services/firebase.js`, uncomment and update the `submitContactForm` function:

```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export const submitContactForm = async (formData) => {
  try {
    const docRef = await addDoc(collection(db, 'contacts'), {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      message: formData.message,
      timestamp: serverTimestamp(),
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error submitting contact form:', error)
    return { success: false, error: error.message }
  }
}
```

## Firestore Collections Structure

### Contacts Collection

The contact form will save submissions to a `contacts` collection with this structure:

```javascript
{
  firstName: string,
  lastName: string,
  email: string,
  message: string,
  timestamp: Timestamp
}
```

### FAQs Collection (Optional)

If you want to manage FAQs from Firebase, create a `faqs` collection:

```javascript
{
  question: string,
  answer: string,
  order: number
}
```

Then update the `getFAQs` function in `src/services/firebase.js` and use it in `src/pages/FAQ.jsx`.

## Security Rules

For production, set up proper Firestore security rules. Example for contacts:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /contacts/{contactId} {
      allow create: if request.resource.data.keys().hasAll(['firstName', 'lastName', 'email', 'message']);
      allow read: if false; // Only admins can read
      allow update: if false;
      allow delete: if false;
    }
  }
}
```

## Testing

After configuration:

1. Start the development server: `npm run dev`
2. Navigate to the contact page
3. Submit a test form
4. Check Firebase Console > Firestore Database to see the submission

## Environment Variables (Recommended)

For better security, use environment variables:

1. Create `.env` file in project root:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

2. Update `src/services/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}
```

3. Add `.env` to `.gitignore` (already included)
