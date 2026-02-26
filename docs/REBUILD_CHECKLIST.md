# Rebuild-from-Zero Checklist

Ordered steps to go from an empty folder to a working School Website. Use [HLD.md](HLD.md) and [LLD.md](LLD.md) as the main design references.

---

## 1. Create repository and scaffold

- Create a new Git repository (local or GitHub).
- Scaffold a Vite + React app:
  - `npm create vite@latest . -- --template react` (or clone an existing template).
  - Install: `react-router-dom`, `firebase`.
  - Set up `index.html` (e.g. RTL, `lang="he"` if needed) and entry point `src/main.jsx` loading `App.jsx`.
- Add `vite.config.js` with React plugin and any custom plugins (e.g. ImageKit auth proxy).
- Add `vercel.json` with rewrites: `/api/*` to `api/*.js`, and `/(.*)` to `/index.html`.

**Ref:** [LLD.md](LLD.md) § 2.1, § 2.7.

---

## 2. Firebase project and Firestore

- Create a Firebase project in [Firebase Console](https://console.firebase.google.com/).
- Enable **Firestore** (production mode); choose region.
- Enable **Authentication** (used only for custom tokens).
- Register a web app and copy the client config into `src/services/firebase.js`.
- Create a **service account** (JSON key) for server-side access; store the JSON securely.
- Deploy **Firestore rules** from `firestore.rules` (see [FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md) for rules summary). Use `firebase deploy --only firestore:rules` (requires `firebase.json`).

**Ref:** [HLD.md](HLD.md) § 1.3, § 1.6; [FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md); [COMPLETE_SETUP_GUIDE.md](../COMPLETE_SETUP_GUIDE.md) (Firebase section).

---

## 3. Add `api/` and environment variables

- Create serverless handlers in `api/`:
  - `custom-token.js` — validate credentials, issue Firebase custom token.
  - `auth.js` — ImageKit auth (token, signature, expire).
  - `publish-texts.js`, `save-json-local.js`, `export-all.js` (and optionally `publish-texts-local.js`).
- Set **server env vars** (Vercel or local): `FIREBASE_SERVICE_ACCOUNT` (single-line JSON), `ADMIN_PASSWORD` (optional), `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_FILE_PATH`, `IMAGEKIT_PRIVATE_KEY`. See [ENV_REFERENCE.md](ENV_REFERENCE.md).
- Set **client env vars** (Vite): `VITE_SITE_URL`, `VITE_EMAILJS_*`, `VITE_IMAGEKIT_AUTH_ENDPOINT` as needed.

**Ref:** [LLD.md](LLD.md) § 2.4, § 2.5; [API_SPEC.md](API_SPEC.md); [ENV_REFERENCE.md](ENV_REFERENCE.md).

---

## 4. Implement auth (custom token + session)

- **Custom token:** Ensure `POST /api/custom-token` accepts `username`/`password`, checks system admin or `appUsers` in Firestore, returns `{ token }`. See [API_SPEC.md](API_SPEC.md).
- **Client:** Login page (e.g. `ParliamentLogin.jsx`) — on success, call `/api/custom-token`, then `signInWithCustomToken(auth, token)`; store app session (e.g. `localStorage.session`) with user id, display name, role.
- **RBAC:** Implement `requireRole.jsx` (role constants, `useEffectiveRole`, `RequireRole`); protect admin routes with `AdminRoute` and `RequireRole` (see [LLD.md](LLD.md) § 2.2).

**Ref:** [HLD.md](HLD.md) § 1.4; [LLD.md](LLD.md) § 2.6 (auth/session files).

---

## 5. Implement Firestore data layer and cache

- **firebaseDB.js:** Implement Firestore operations for all collections: translations, images, contacts, parliamentDates, parliamentSubjects, parliamentNotes, parliamentHistory, appUsers (and optional users/faqs). See [FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md).
- **Cache:** Add in-memory + localStorage cache (e.g. 5-minute TTL) for parliament dates/subjects/notes and clear cache after mutations.
- **textService / adminService:** Load/save translations, call publish/save APIs as needed.

**Ref:** [HLD.md](HLD.md) § 1.5; [LLD.md](LLD.md) § 2.3, § 2.6; [FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md).

---

## 6. Pages and admin (per LLD routes)

- **Router:** Define routes as in [LLD.md](LLD.md) § 2.2: Home, FAQ, Contact, Parent Committee, Parents Association, Parliament, Parliament Login, Unauthorized, Admin Dashboard, Parliament Admin, NotFound.
- **Layout:** Header, Footer, AdminIndicator; wrap app in TranslationProvider and AdminProvider.
- **Public pages:** Implement Home, FAQ, Contact, Parent Committee, Parents Association, Parliament (list dates, subjects, notes; submit subject when logged in).
- **Admin:** Admin Dashboard (translations load/edit/save/publish, Users tab if role allows); Parliament Admin (dates CRUD, subject queue approve/reject, history); UsersAdmin component (user CRUD, roles). Use EditableText, EditableImage, EditableLink, section editors, FAQEditor, ImageKitUpload where content is editable.

**Ref:** [LLD.md](LLD.md) § 2.1, § 2.2, § 2.6.

---

## 7. Deploy (Vercel and env)

- Connect repo to Vercel; set **all** server and client env vars (see [ENV_REFERENCE.md](ENV_REFERENCE.md)).
- Build command: `vite build`; output directory: `dist`. Vercel will run serverless functions from `api/` per rewrites.
- Deploy; verify `/api/custom-token`, `/api/auth`, and SPA routes work.

**Ref:** [HLD.md](HLD.md) § 1.7; [COMPLETE_SETUP_GUIDE.md](../COMPLETE_SETUP_GUIDE.md) (Vercel section).

---

## 8. Optional: GitHub content, EmailJS, ImageKit

- **GitHub:** If using publish-to-GitHub, ensure repo has `content/texts.json` and `GITHUB_TOKEN` has `repo` scope; test `/api/publish-texts`.
- **EmailJS:** Configure service, template, and public key; set `VITE_EMAILJS_*` and wire contact form to EmailJS in the client.
- **ImageKit:** Create ImageKit account; set `IMAGEKIT_PRIVATE_KEY` and `VITE_IMAGEKIT_AUTH_ENDPOINT`; use ImageKitUpload component for admin image uploads.

**Ref:** [ENV_REFERENCE.md](ENV_REFERENCE.md); [COMPLETE_SETUP_GUIDE.md](../COMPLETE_SETUP_GUIDE.md).

---

## 9. Testing and docs

- Add Vitest for unit/API tests; Playwright for E2E. See [TESTING.md](../TESTING.md).
- Keep docs in sync: [HLD.md](HLD.md), [LLD.md](LLD.md), [API_SPEC.md](API_SPEC.md), [ENV_REFERENCE.md](ENV_REFERENCE.md), [FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md), [TROUBLESHOOTING_INDEX.md](TROUBLESHOOTING_INDEX.md).

---

## Quick reference

| Step | Main ref |
|------|----------|
| 1. Repo + scaffold | LLD § 2.1, § 2.7 |
| 2. Firebase + Firestore | HLD § 1.3, FIRESTORE_DATA_MODEL, COMPLETE_SETUP_GUIDE |
| 3. API + env | LLD § 2.4–2.5, API_SPEC, ENV_REFERENCE |
| 4. Auth | HLD § 1.4, LLD § 2.6, API_SPEC (custom-token) |
| 5. firebaseDB + cache | HLD § 1.5, LLD § 2.3, FIRESTORE_DATA_MODEL |
| 6. Pages + admin | LLD § 2.2, § 2.6 |
| 7. Deploy | HLD § 1.7, COMPLETE_SETUP_GUIDE |
| 8. Optional services | ENV_REFERENCE, COMPLETE_SETUP_GUIDE |
| 9. Testing + docs | TESTING.md, HLD § 1.8–1.9 |
