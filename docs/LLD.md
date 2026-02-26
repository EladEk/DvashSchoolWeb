# Low-Level Design (LLD) — School Website

Implementation-level reference: modules, APIs, data models, and key files. Target: developers implementing or refactoring.

---

## 2.1 Repository Structure

| Path | Purpose |
|------|---------|
| `src/` | React app: `main.jsx`, `App.jsx`, `pages/`, `components/`, `contexts/`, `services/`, `hooks/`, `utils/`, `translations/` |
| `api/` | Serverless: `custom-token.js`, `auth.js` (ImageKit), `publish-texts.js`, `save-json-local.js`, `export-all.js`, `publish-texts-local.js` |
| `server/` | Optional local ImageKit auth server |
| `public/`, `content/` | Static assets and `texts.json` |
| `scripts/`, `tests/`, `e2e/` | Tooling and tests |
| Root | `vite.config.js`, `vitest.config.js`, `playwright.config.js`, `vercel.json`, `firestore.rules` |

---

## 2.2 Routes (from `src/App.jsx`)

| Path | Component | Protection |
|------|-----------|------------|
| `/` | Home | Public |
| `/FAQ` | FAQ | Public |
| `/contact` | ContactPage | Public |
| `/contact-8` | Redirect → `/contact` | Legacy |
| `/parent-committee` | ParentCommittee | Public |
| `/parents-association` | ParentsAssociation | Public |
| `/parliament` | Parliament | Public |
| `/parliament/login` | ParliamentLogin | Public |
| `/unauthorized` | Unauthorized | Public |
| `/admin`, `/admin/` | RedirectToLogin → `/parliament/login` | — |
| `/admin/dashboard` | AdminDashboard | AdminRoute: admin, manager, editor |
| `/admin/parliament` | ParliamentAdmin | RequireRole: admin, manager, committee |
| `*` | NotFound | Catch-all |

---

## 2.3 Firestore Collections

From `src/services/firebaseDB.js` and `firestore.rules`:

| Collection | Main use | Key fields / notes |
|------------|----------|--------------------|
| `translations` | Site copy (he/en) | Docs `he`, `en` |
| `images` | Hero, sections | Doc per `imageKey` |
| `contacts` | Contact form submissions | — |
| `parliamentDates` | Parliament dates | `isOpen`, ordered by `date` |
| `parliamentSubjects` | Subjects per date | `dateId`, `status` (pending/approved/rejected) |
| `parliamentNotes` | Notes per subject | Keyed by subject |
| `parliamentHistory` | Archives | `orderBy('archivedAt','desc')` |
| `appUsers` | App users (login) | username, usernameLower, firstName, lastName, role, roles, birthday, classId, passwordHash, createdAt |
| `users` | Optional fallback for role resolution | — |
| `faqs` | FAQ docs | Read/write rules defined |

See [FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md) for full field details.

---

## 2.4 API Endpoints

| Method | Path | Purpose | Env |
|--------|------|---------|-----|
| POST | `/api/custom-token` | Issue Firebase custom token (system admin or app user from `appUsers`) | FIREBASE_SERVICE_ACCOUNT, ADMIN_PASSWORD |
| GET | `/api/auth` | ImageKit auth (token, signature, expire) | IMAGEKIT_PRIVATE_KEY |
| POST | `/api/publish-texts` | Read Firestore translations, push to GitHub `content/texts.json` | FIREBASE_SERVICE_ACCOUNT, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_FILE_PATH |
| POST | `/api/save-json-local` | Save JSON to repo (Firestore + local files) | FIREBASE_SERVICE_ACCOUNT, GITHUB_* |
| GET/POST | `/api/export-all` | Export data (Firestore + optional Git texts) | FIREBASE_SERVICE_ACCOUNT, optional VITE_SITE_URL |
| POST | `/api/publish-texts-local` | Local publish variant (no GitHub push) | FIREBASE_SERVICE_ACCOUNT, GITHUB_FILE_PATH |

Full contracts: [API_SPEC.md](API_SPEC.md).

---

## 2.5 Environment Variables

| Scope | Variables |
|-------|-----------|
| **Server/API** | `FIREBASE_SERVICE_ACCOUNT` (JSON string, single line), `ADMIN_PASSWORD` (optional), `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_FILE_PATH`, `IMAGEKIT_PRIVATE_KEY`, `VITE_SITE_URL` (optional for export) |
| **Client (Vite)** | `VITE_SITE_URL`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY`, `VITE_IMAGEKIT_AUTH_ENDPOINT` |

Firebase client config is in `src/services/firebase.js` (no env there in current codebase).

Full reference: [ENV_REFERENCE.md](ENV_REFERENCE.md).

---

## 2.6 Key Modules and Files

| Area | Files |
|------|-------|
| **Auth/session** | `src/pages/ParliamentLogin.jsx` (login/signup, session), `api/custom-token.js` (custom token), `src/utils/requireRole.jsx` (RBAC), `src/components/AdminRoute.jsx` |
| **Data** | `src/services/firebaseDB.js` (Firestore + cache), `src/services/textService.js` (load/publish texts), `src/services/adminService.js` |
| **Admin UI** | `src/pages/AdminDashboard.jsx`, `src/pages/ParliamentAdmin.jsx`, `src/components/admin/UsersAdmin.jsx`, `src/components/AdminIndicator.jsx` |
| **Editable content** | `EditableText`, `EditableImage`, `EditableLink`, `GenericSectionEditor`, `SectionEditor`, `FAQEditor`, `ImageKitUpload` (under `src/components/`) |
| **Contexts** | `src/contexts/TranslationContext.jsx`, `src/contexts/AdminContext.jsx` |

---

## 2.7 Build and Run

- `npm run dev` — Vite dev server
- `npm run dev:all` — Vite + local ImageKit auth server
- `npm run build` / `npm run preview` — Production build
- Tests: Vitest (`npm run test`, `npm run test:api`), Playwright (`npm run test:e2e`). See [TESTING.md](../TESTING.md).

---

## 2.8 Testing

- **Unit/API:** Vitest — `npm run test`, `npm run test:api`.
- **E2E:** Playwright — `npm run test:e2e`.
- Full details: [TESTING.md](../TESTING.md) in project root.

---

## 2.9 Documentation

- **HLD:** [docs/HLD.md](HLD.md) — architecture, boundaries, data flow.
- **Setup:** [COMPLETE_SETUP_GUIDE.md](../COMPLETE_SETUP_GUIDE.md).
- **Rebuild from zero:** [docs/REBUILD_CHECKLIST.md](REBUILD_CHECKLIST.md).
- **API:** [docs/API_SPEC.md](API_SPEC.md).
- **Environment:** [docs/ENV_REFERENCE.md](ENV_REFERENCE.md).
- **Firestore:** [docs/FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md).
- **Troubleshooting:** [docs/TROUBLESHOOTING_INDEX.md](TROUBLESHOOTING_INDEX.md).
