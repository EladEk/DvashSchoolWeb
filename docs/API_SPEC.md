# API Specification

Contract for each serverless endpoint. All endpoints are under the same origin; Vercel rewrites `/api/*` to the corresponding file in `api/`.

---

## 1. POST `/api/custom-token`

**Purpose:** Issue a Firebase custom token so the client can call `signInWithCustomToken(auth, token)` and satisfy Firestore write rules (`request.auth != null`).

**Request:**

- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  - `username` (string, required)
  - `password` (string, required)

**Response:**

- **200:** `{ "token": "<firebase-custom-token>" }`
- **400:** `{ "error": "username and password are required" }`
- **401:** `{ "error": "Invalid username or password" }`
- **500:** `{ "error": "Failed to issue token", "message": "..." }` (e.g. env not set)

**Auth:** None (endpoint validates credentials). System admin: `username === 'admin'` and password matches `ADMIN_PASSWORD`. App user: looked up in Firestore `appUsers` by `usernameLower`, password compared to stored SHA-256 hash.

**Env:** `FIREBASE_SERVICE_ACCOUNT`, `ADMIN_PASSWORD` (optional).

---

## 2. GET `/api/auth`

**Purpose:** ImageKit authentication (token, signature, expire) for client-side ImageKit uploads.

**Request:**

- **Method:** GET
- **Body:** None

**Response:**

- **200:** `{ "token": "<hex>", "signature": "<hex>", "expire": <unix-seconds> }`
- **405:** `{ "error": "Method not allowed" }` (non-GET)
- **500:** `{ "error": "ImageKit private key not configured", "message": "..." }` or `{ "error": "Failed to generate authentication" }`

**Auth:** None. Server uses `IMAGEKIT_PRIVATE_KEY` to compute HMAC-SHA1 signature.

**Env:** `IMAGEKIT_PRIVATE_KEY`.

---

## 3. POST `/api/publish-texts`

**Purpose:** Fetch translations (and images) from Firestore, exclude Parliament keys, then update the file `content/texts.json` in the GitHub repository via Git API.

**Request:**

- **Method:** POST
- **Headers:** Optional `Authorization: Bearer <firebase-id-token>` (for future server-side auth; currently not verified in code).
- **Body (JSON):**
  - `commitMessage` (string, optional) — Git commit message.

**Response:**

- **200:** `{ "success": true, "message": "...", "commit": { "sha": "...", "url": "..." }, ... }` (success with commit info)
- **405:** `{ "error": "Method not allowed" }`
- **500:** JSON with `error`, `message`, and optionally `hint` (e.g. missing `GITHUB_TOKEN`, Firebase init failure, or GitHub API error).

**Auth:** No request auth enforced; deployment and env security only.

**Env:** `FIREBASE_SERVICE_ACCOUNT`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_FILE_PATH`.

---

## 4. POST `/api/save-json-local`

**Purpose:** Build texts (from request body or from Firestore) plus images from Firestore, exclude Parliament keys, then either return JSON for download (on Vercel) or write to `content/texts.json` and `public/content/texts.json` (local).

**Request:**

- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  - `texts` (object, optional) — `{ he: {...}, en: {...} }`. If omitted, texts are loaded from Firestore.

**Response:**

- **200 (Vercel):** `{ "success": true, "message": "...", "download": true, "jsonContent": "<stringified JSON>" }`
- **200 (local):** `{ "success": true, "message": "JSON files saved successfully", "files": [ { "path": "..." }, ... ] }`
- **400:** `{ "error": "No texts provided and Firebase not configured", "hint": "..." }`
- **405:** `{ "error": "Method not allowed" }`
- **500:** `{ "error": "..." , "message": "..." }`

**Auth:** None.

**Env:** `FIREBASE_SERVICE_ACCOUNT`, `GITHUB_FILE_PATH` (for path); optional GitHub vars if used elsewhere.

---

## 5. GET / POST `/api/export-all`

**Purpose:** Export all data: Git content (fetched from site URL `content/texts.json`) plus all Firestore collections. Returns one JSON payload; no file system write (safe for Vercel).

**Request:**

- **Method:** GET or POST
- **Query (GET):** `siteUrl` (optional) — base URL to fetch `/content/texts.json`.
- **Body (POST):** `siteUrl` (optional). If omitted, uses `process.env.VITE_SITE_URL` or `https://${VERCEL_URL || 'dvashschool.vercel.app'}`.

**Response:**

- **200:** `{ "success": true, "message": "...", "download": true, "jsonContent": "<stringified JSON>" }`. The JSON contains `exportedAt`, `git` (texts or null), `db` (translations, images, contacts, parliamentDates, parliamentSubjects, parliamentNotes, parliamentHistory, appUsers; or `db.error` on Firestore failure).
- **405:** `{ "error": "Method not allowed" }`
- **500:** `{ "error": "Export failed", "message": "..." }`

**Auth:** None.

**Env:** `FIREBASE_SERVICE_ACCOUNT`; optional `VITE_SITE_URL` (or `VERCEL_URL` on Vercel).

---

## 6. POST `/api/publish-texts-local`

**Purpose:** Local/testing variant of publish: reads texts from Firestore (or request body), writes to local `public/content/texts.json` and `content/texts.json`; does not push to GitHub.

**Request:**

- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  - `texts` (object, optional) — `{ he: {...}, en: {...} }`. If omitted, loaded from Firestore.
  - `commitMessage` (string, optional) — used only for logging/local message.

**Response:**

- **200:** `{ "success": true, "message": "...", "path": "..." }` (or similar success shape)
- **405:** `{ "error": "Method not allowed" }`
- **500:** `{ "error": "..." , "message": "..." }`

**Auth:** None.

**Env:** `FIREBASE_SERVICE_ACCOUNT`, `GITHUB_FILE_PATH` (for path).

---

## Vercel rewrites

From `vercel.json`:

- `/api/auth` → `/api/auth.js`
- `/api/custom-token` → `/api/custom-token.js`
- `/api/publish-texts` → `/api/publish-texts.js`
- `/api/save-json-local` → `/api/save-json-local.js`
- `/api/export-all` → `/api/export-all.js`
- `/(.*)` → `/index.html` (SPA fallback)

Note: `publish-texts-local.js` is not in rewrites; add a rewrite if you deploy and call it.

---

See also: [ENV_REFERENCE.md](ENV_REFERENCE.md), [LLD.md](LLD.md).
