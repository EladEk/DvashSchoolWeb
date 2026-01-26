# Next Step: Verify Firestore Database Exists

✅ Firestore API is enabled
✅ IAM roles are correct

Now let's check if the **Firestore database** exists:

## Check Database

**Go to Firebase Console:**
https://console.firebase.google.com/project/dvashschoolweb/firestore

**OR**

**Go to Google Cloud Console:**
https://console.cloud.google.com/firestore/databases?project=dvashschoolweb

## What to Look For

1. **Do you see a database listed?**
   - If YES → Check if it's in **Native mode** (not Datastore mode)
   - If NO → You need to create it (see below)

2. **If you see "Create database" button:**
   - Click it
   - Choose **Native mode** (NOT Datastore mode)
   - Select a location (choose closest to your users, e.g., `us-central1`)
   - Click "Create"
   - Wait for creation to complete (1-2 minutes)

## Check Translations Collection

After confirming the database exists:

**Go to:** https://console.firebase.google.com/project/dvashschoolweb/firestore/data

1. Do you see a `translations` collection?
2. Do you see `he` and `en` documents inside it?

**Note:** Even if the collection doesn't exist, the code should handle it (it checks `doc.exists`), but the database itself must exist.

## If Database Exists But Still Failing

If the database exists and you're still getting UNAUTHENTICATED, try:

1. **Regenerate service account key:**
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=dvashschoolweb
   - Click on `firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com`
   - Go to "Keys" tab
   - Generate a new JSON key
   - Update `FIREBASE_SERVICE_ACCOUNT` in Vercel
   - Redeploy

2. **Check database mode:**
   - Make sure it's **Native mode**, not Datastore mode
   - The code expects Native mode Firestore

Let me know what you find!
