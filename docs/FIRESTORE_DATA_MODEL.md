# Firestore Data Model

Collections, main fields, usage, and rules summary. Implementation reference: `src/services/firebaseDB.js` and `firestore.rules`.

---

## Rules summary

- **Read:** Most collections allow `read: if true` (public).
- **Write:** Most allow `write: if request.auth != null` (authenticated via Firebase Auth; client obtains token from `/api/custom-token`).
- **contacts:** `create: if true` (anyone can submit); `read, update, delete: if request.auth != null`.
- **Default:** `match /{document=**} { allow read, write: if false; }`.

Deploy rules: `firebase deploy --only firestore:rules` (requires `firebase.json` with `"firestore": { "rules": "firestore.rules" }`).

---

## Collections

### `translations`

| Purpose | Site copy (Hebrew and English). |
|---------|-------------------------------|
| Document IDs | `he`, `en` (one doc per language). |
| Fields | Arbitrary key-value structure (nested keys like `about.title`, `hero.subtitle`). Used by translation context and admin dashboard. |
| Rules | `allow read: if true; allow write: if request.auth != null;` |
| Main operations | `loadTranslationsFromDB`, `saveTranslationToDB`, `saveAllTranslationsToDB` (firebaseDB.js). |

---

### `images`

| Purpose | Store image paths (e.g. ImageKit paths) keyed by a string key. |
|---------|---------------------------------------------------------------|
| Document IDs | `imageKey` (e.g. `hero.image`, section image keys). |
| Fields | `path` (string, normalized path or URL). Other legacy fields: `location`, `url`, `imageUrl`, `imagePath` (export-all normalizes to these). |
| Rules | `allow read: if true; allow write: if request.auth != null;` |
| Main operations | `saveImagePathToDB`, `loadImagePathFromDB`, `deleteImageFromDB` (firebaseDB.js). |

---

### `contacts`

| Purpose | Contact form submissions. |
|---------|---------------------------|
| Document IDs | Auto-generated. |
| Fields | `firstName`, `lastName`, `email`, `message`, `timestamp` (serverTimestamp). |
| Rules | `allow create: if true; allow read, update, delete: if request.auth != null;` |
| Main operations | `submitContactFormToDB` (firebaseDB.js). |

---

### `parliamentDates`

| Purpose | Parliament session dates (title, date, open/closed). |
|---------|------------------------------------------------------|
| Document IDs | Auto-generated. |
| Fields | `title`, `date`, `isOpen`, `createdAt`, `createdByUid`, `createdByName`. |
| Queries | Ordered by `date` ascending. |
| Rules | `allow read: if true; allow write: if request.auth != null;` |
| Main operations | `loadParliamentDates`, `createParliamentDate`, `updateParliamentDate`, `toggleParliamentDate`, `archiveParliamentDate`, `deleteParliamentDate` (firebaseDB.js). |

---

### `parliamentSubjects`

| Purpose | Subjects (proposals) per parliament date; status workflow (pending → approved/rejected). |
|---------|-----------------------------------------------------------------------------------------|
| Document IDs | Auto-generated. |
| Fields | `title`, `description`, `createdByUid`, `createdByName`, `createdByFullName`, `createdAt`, `status` (`pending` \| `approved` \| `rejected`), `statusReason`, `dateId`, `dateTitle`, `notesCount`. |
| Queries | By `dateId`; by `status`. |
| Rules | `allow read: if true; allow write: if request.auth != null;` |
| Main operations | `loadParliamentSubjects`, `createParliamentSubject`, `updateParliamentSubject`, `updateParliamentSubjectStatus`, `deleteParliamentSubject` (firebaseDB.js). |

---

### `parliamentNotes`

| Purpose | Notes/replies per parliament subject. |
|---------|--------------------------------------|
| Document IDs | Auto-generated. |
| Fields | `subjectId`, `text`, `createdByUid`, `createdByName`, `createdAt`, `updatedAt` (optional), `parentNoteId` (optional, for threading). |
| Queries | By `subjectId`. |
| Rules | `allow read: if true; allow write: if request.auth != null;` |
| Main operations | `loadParliamentNotes`, `createParliamentNote`, `updateParliamentNote`, `deleteParliamentNote` (firebaseDB.js). |

---

### `parliamentHistory`

| Purpose | Archived parliament dates, subjects, and notes (after archive action). |
|---------|-----------------------------------------------------------------------|
| Document IDs | Auto-generated when archiving. |
| Fields | Same as source type plus: `originalId`, `archivedAt`, `type` (`date` \| `subject` \| `note`), `parliamentId`, `decisions`, `summary` (for date/subject), `subjectId` (for notes). |
| Queries | `orderBy('archivedAt', 'desc')`. |
| Rules | `allow read: if true; allow write: if request.auth != null;` |
| Main operations | `archiveParliamentDate` (writes here, deletes from parliamentDates/subjects/notes), `loadParliamentHistory` (firebaseDB.js). |

---

### `appUsers`

| Purpose | App users for Parliament/login: username, hashed password, profile, roles. |
|---------|-----------------------------------------------------------------------------|
| Document IDs | Auto-generated. |
| Fields | `username`, `usernameLower`, `firstName`, `lastName`, `role` (primary), `roles` (array), `birthday`, `classId`, `passwordHash` (SHA-256 hex), `createdAt`. |
| Queries | By `usernameLower` (login lookup); `orderBy('usernameLower')` for user list. |
| Rules | `allow read: if true; allow write: if request.auth != null;` (optional: restrict write to admin via custom claims). |
| Main operations | `findUserByUsername`, `checkUsernameExists`, `createUser`, `updateUser`, `deleteUser`, `loadUsers`; role resolution: `getRoleByDocId`, `resolveUserRoles` (firebaseDB.js). Used by `api/custom-token.js` for credential check. |

---

### `users`

| Purpose | Optional fallback for role resolution (e.g. Firebase Auth UID mapping). |
|---------|------------------------------------------------------------------------|
| Document IDs | Typically user ID. |
| Fields | Role-related (e.g. `isAdmin`, `role`). |
| Rules | `allow read: if true; allow write: if request.auth != null;` |
| Main operations | `getRoleByDocId`, `getRoleByField` (firebaseDB.js). |

---

### `faqs`

| Purpose | FAQ documents (referenced in firebase.js; enable when used). |
|---------|--------------------------------------------------------------|
| Document IDs | Any. |
| Rules | `allow read: if true; allow write: if request.auth != null;` |

---

## Indexes

If you use composite queries (e.g. `parliamentSubjects` by `dateId` and `status`), create the required Firestore indexes when the client prompts, or in Firebase Console → Firestore → Indexes.

---

See also: [firestore.rules](../firestore.rules), [LLD.md](LLD.md), [HLD.md](HLD.md).
