# Quick Checks - Firestore Access Issue

Since IAM roles are correct, let's check these:

## 1. Check Firestore API is Enabled

**Go to:** https://console.cloud.google.com/apis/library?project=dvashschoolweb

1. Search for: **"Cloud Firestore API"**
2. Check if it shows **"Enabled"**
3. If it says "Enable API", click it and wait 1-2 minutes

## 2. Check Firestore Database Exists

**Go to:** https://console.cloud.google.com/firestore/databases?project=dvashschoolweb

**OR**

**Go to:** https://console.firebase.google.com/project/dvashschoolweb/firestore

1. Do you see a database listed?
2. If you see **"Create database"**, you need to create it first:
   - Click "Create database"
   - Choose **Native mode** (recommended)
   - Select a location (choose closest to your users)
   - Click "Create"
   - Wait for it to finish

## 3. Verify Database Mode

If a database exists, check its mode:
- **Native mode** = Firestore (what we need)
- **Datastore mode** = Legacy (might cause issues)

The code expects **Native mode**.

## 4. Check if Translations Collection Exists

**Go to:** https://console.firebase.google.com/project/dvashschoolweb/firestore/data

1. Do you see a `translations` collection?
2. Do you see `he` and `en` documents inside it?

If not, the collection might not exist yet, but the code should handle that (it checks `doc.exists`).

## Most Likely Issue

Based on the error, I suspect **Firestore API is not enabled** or **the database doesn't exist**.

Check #1 and #2 above - those are the most common causes when IAM is correct but you still get UNAUTHENTICATED.
