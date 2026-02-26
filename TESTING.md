Testing
=======

Quick start
----------

- **Unit + API tests:** `npm run test` or `npm run test:api` (backend) and `npm run test:ui` (frontend)
- **E2E tests:** `npm run test:e2e` (Playwright starts the dev server automatically, then runs E2E; do not run `npm run dev` in another terminal, or stop it so port 5173 is free)
- **Full run + dashboard:** `npm run test:all` (API + UI tests, then E2E, then dashboard)
- **Full run without E2E:** `npm run test:all:no-e2e` (API + UI + dashboard only; use if E2E fail in your environment)
- **Dashboard only (from last run):** `npm run test:dashboard`
- **View dashboard and run a single test from the UI:** `npm run test:dashboard:serve` then open http://localhost:3456/dashboard.html
- **Playwright HTML report** (after E2E): open `playwright-report/index.html` (report is in project root to avoid clashing with `test-results/`)

In Windows CMD, only run the `npm run ...` lines above. Do not paste lines that start with # (that was a comment and CMD will error).

## Sanity suite

- **Run sanity tests only:** `npm run test:sanity` — runs API + Backend (Vitest) and critical E2E (smoke, admin dashboard export, parliament auth), then generates dashboard data.
- Use for a quick check before commit or in CI.

## Dashboard

- **Start the dashboard server:** `npm run test:dashboard:serve` then open **http://localhost:3456** (or http://localhost:3456/dashboard.html).
- The dashboard shows:
  - **Summary** by layer (Backend, Frontend, E2E) and total passed/failed/skipped
  - **Running process** — live output when you run tests from the dashboard
  - **All tests** table: Layer, Suite, Test, **Expected**, Status, **Actual**, Duration, and a **Run** button per row
- **Run Sanity** — runs the sanity suite and streams output in the dashboard; refreshes results when done.
- **Run All** — runs the full suite (`npm run test:all`) and streams output.
- **Refresh results** — reloads the full test list and latest results (from `test-results-dashboard/`).
- The table shows **all available tests** with their **latest result** (passed/failed/skipped/Not run). On first load, if no run has been done, the server may run test discovery (Playwright list + Vitest) to build the list; then you can run Sanity or Run All to populate results.

After running tests from the CLI, open the same URL to see results. Dashboard data is stored in `test-results-dashboard/` (vitest-results.json, playwright-results.json, dashboard-data.json, all-tests.json).

## Layout

- `tests/setup.js` — Vitest + RTL setup
- `tests/helpers/createMockReqRes.js` — mock req/res for API tests
- `tests/api/*.test.js` — API handler tests
- `tests/backend/auth-server.test.js` — Node auth server tests
- `tests/components/*.test.jsx` — React component tests
- `e2e/*.spec.js` — Playwright E2E specs
- `e2e/helpers.js` — shared `gotoE2E`, `waitForAppReady`
- `e2e/auth-helper.js` — `loginAsAdmin(page)` for system admin (admin / Panda123)
- `scripts/ensure-test-env.js` — checks dev server is up (used by test:e2e and test:all)
- `scripts/generate-test-dashboard.js` — builds dashboard HTML from Vitest + Playwright JSON
- `scripts/test-dashboard-server.js` — serves dashboard and exposes `/api/results`, `/api/tests/list` (all tests + latest result), `/api/run-test`, `/api/run-sanity`, `/api/run-all`
- `scripts/list-all-tests.js` — discovers all E2E (Playwright list) and unit/API tests (Vitest) for the dashboard

## E2E note

**E2E server:** Playwright starts the dev server (see `playwright.config.js` for port). If E2E fails with **"#e2e-marker not found"**, the wrong app may be running. **Fix:** Stop any other dev server, then run `set E2E_FRESH=1 && npm run test:e2e` (Windows) or `E2E_FRESH=1 npm run test:e2e` (Unix).

**E2E scenarios (see `e2e/*.spec.js`):** Login (valid/invalid), protected routes (dashboard, parliament admin), register (form + validation: password mismatch, short password, empty fields), create parliament date (modal, submit), parliament subject/notes (form visibility, add note), admin dashboard export (Save JSON, Export all), **Parliament full coverage** (`e2e/parliament-full.spec.js`): create parliament date (admin/manager/committee), suggest subject (all 6 roles), approve/decline subjects (queue, reject modal), add note, reply to note, edit note, delete note. **HLD coverage** (`e2e/hld-coverage.spec.js`): contact page and form, unauthorized page, editor denied parliament admin, admin login redirect, parliament public read. **Negative tests:** Unauthenticated access to `/admin/dashboard` and `/admin/parliament`, invalid login error message, register validation errors, empty create-date submit disabled, editor cannot access `/admin/parliament`. Some flows (register success, create date, subject/note creation) require Firebase or a test user; E2E still covers UI and error paths. Run a single file: `npx playwright test e2e/parliament-auth.spec.js`, `npx playwright test e2e/parliament-full.spec.js`, or `npx playwright test e2e/hld-coverage.spec.js`.

**`npm run test:all` runs E2E.** If E2E fail (e.g. app does not load in the Playwright browser), run `npm run test:all:no-e2e` for API + UI + dashboard only.

**E2E env recognition:** E2E tests navigate with `?e2e=1` so the app knows it is in test mode: the app skips the translation loader and renders the main layout immediately (no network wait). This avoids timeouts when the test browser cannot load translations. The app detects `e2e=1` in the URL or `sessionStorage.e2e` (set by a script in `index.html` when the param is present).

The app also has an 8s translation timeout and 12s safety fallback for non-E2E loads. Playwright launches the browser with **no proxy** (`--no-proxy-server`). Run with proxy cleared if needed: `set HTTP_PROXY=& set HTTPS_PROXY=& npm run test:e2e` (Windows).
