# Environment Variables Reference

All environment variables used by the School Website, where they are used, and how to obtain values.

---

## Server / API (Vercel or local)

Set these in Vercel: **Project Settings → Environment Variables**. For local API (e.g. `vite preview` with API proxy), use a `.env` file in the project root (ensure serverless/Node can read it).

| Variable | Required | Used by | Description | How to get |
|----------|----------|---------|-------------|------------|
| `FIREBASE_SERVICE_ACCOUNT` | Yes (for API that uses Firestore) | `api/custom-token.js`, `api/publish-texts.js`, `api/save-json-local.js`, `api/export-all.js`, `api/publish-texts-local.js` | Full Firebase service account JSON as a **single-line string**. Use `\n` for newlines inside `private_key`. | Google Cloud Console → IAM & Admin → Service Accounts → Create key (JSON). Use [scripts/env-oneline.js](../scripts/env-oneline.js) to produce a one-liner. |
| `ADMIN_PASSWORD` | No (default: `Panda123`) | `api/custom-token.js` | Password for system admin user (`username === 'admin'`). | Set a strong password in production. |
| `GITHUB_TOKEN` | Yes (for publish) | `api/publish-texts.js`, `api/save-json-local.js` | GitHub personal access token with `repo` scope (for pushing `content/texts.json`). | GitHub → Settings → Developer settings → Personal access tokens. |
| `GITHUB_OWNER` | No (default: `EladEk`) | `api/publish-texts.js` | GitHub repository owner. | Your GitHub username or org. |
| `GITHUB_REPO` | No (default: `DvashSchoolWeb`) | `api/publish-texts.js` | GitHub repository name. | Your repo name. |
| `GITHUB_FILE_PATH` | No (default: `content/texts.json`) | `api/publish-texts.js`, `api/save-json-local.js`, `api/publish-texts-local.js` | Path to the texts file in the repo. | Usually `content/texts.json`. |
| `IMAGEKIT_PRIVATE_KEY` | Yes (for ImageKit auth) | `api/auth.js`, `server/auth-server.js`, Vite plugin `vite-plugin-imagekit-auth.js` | ImageKit private key for HMAC signature. | ImageKit dashboard → Developer options → Private key. |
| `VITE_SITE_URL` | No (optional for export) | `api/export-all.js` | Base URL of the site (used to fetch `/content/texts.json`). | e.g. `https://yoursite.vercel.app`. |
| `VERCEL_URL` | Set by Vercel | `api/export-all.js` | Used as fallback when `VITE_SITE_URL` is not set. | Automatic on Vercel. |

---

## Client (Vite / browser)

These are exposed to the browser (prefixed with `VITE_`). Set in `.env` or in Vercel Environment Variables for the build. Do not put secrets here.

| Variable | Required | Used by | Description | How to get |
|----------|----------|---------|-------------|------------|
| `VITE_SITE_URL` | No | `DocumentHead.jsx`, `BreadcrumbSchema.jsx`, `FAQSchema.jsx`, `OrganizationSchema.jsx` | Canonical site URL for meta and schema. | e.g. `https://dvashschool.vercel.app`. |
| `VITE_EMAILJS_SERVICE_ID` | Yes (for contact form email) | `src/services/emailService.js` | EmailJS service ID. | EmailJS dashboard → Email Services. |
| `VITE_EMAILJS_TEMPLATE_ID` | Yes (for contact form email) | `src/services/emailService.js` | EmailJS template ID. | EmailJS dashboard → Email Templates. |
| `VITE_EMAILJS_PUBLIC_KEY` | Yes (for contact form email) | `src/services/emailService.js` | EmailJS public key. | EmailJS dashboard → Account → API Keys. |
| `VITE_IMAGEKIT_AUTH_ENDPOINT` | Yes (for ImageKit upload in dev) | `src/components/ImageKitUpload.jsx` | URL for ImageKit auth. In production usually `/api/auth` (same origin). For local dev: e.g. `http://localhost:3001/auth` if using `server/auth-server.js`. | Use `/api/auth` in production; for local auth server use `http://localhost:3001/auth`. |

---

## Firebase client config (no env)

Firebase client configuration (apiKey, authDomain, projectId, etc.) is set in code in `src/services/firebase.js`, not via environment variables in the current codebase. For a from-zero rebuild you can move these to `VITE_*` vars if desired.

---

## Summary by endpoint / feature

| Endpoint / feature | Env vars needed |
|-------------------|------------------|
| `/api/custom-token` | `FIREBASE_SERVICE_ACCOUNT`, `ADMIN_PASSWORD` (optional) |
| `/api/auth` (ImageKit) | `IMAGEKIT_PRIVATE_KEY` |
| `/api/publish-texts` | `FIREBASE_SERVICE_ACCOUNT`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_FILE_PATH` |
| `/api/save-json-local` | `FIREBASE_SERVICE_ACCOUNT`, `GITHUB_FILE_PATH` (and GitHub vars if pushing) |
| `/api/export-all` | `FIREBASE_SERVICE_ACCOUNT`, optional `VITE_SITE_URL` |
| Contact form (EmailJS) | `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY` |
| ImageKit upload | `IMAGEKIT_PRIVATE_KEY` (API), `VITE_IMAGEKIT_AUTH_ENDPOINT` (client) |

---

See also: [COMPLETE_SETUP_GUIDE.md](../COMPLETE_SETUP_GUIDE.md) (per-service setup), [LLD.md](LLD.md) (overview).
