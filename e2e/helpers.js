/**
 * E2E helpers: env check, navigation with e2e=1, wait for app ready.
 * Ensures we're loading our app and e2e mode is active before asserting.
 */

const MARKER_TIMEOUT = 10000
const ROOT_MOUNT_TIMEOUT = 25000
const SKIP_LINK_TIMEOUT = 25000

/**
 * Navigate with ?e2e=1 so the app skips translation load and renders immediately.
 * After navigation, ensure the marker is set (in case inline script ran before URL was set).
 */
export async function gotoE2E(page, path) {
  const sep = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${sep}e2e=1`)
  await page.evaluate(() => {
    if (typeof location !== 'undefined' && location.search.indexOf('e2e=1') !== -1) {
      try {
        sessionStorage.setItem('e2e', '1')
        const m = document.getElementById('e2e-marker')
        if (m) m.setAttribute('data-e2e', '1')
      } catch (e) {}
    }
  }).catch(() => {})
}

/**
 * Verify the dev server is serving our app (optional quick check).
 */
export async function assertServerOk(page) {
  const res = await page.goto('/e2e-ping.html', { waitUntil: 'domcontentloaded', timeout: 10000 })
  if (!res || res.status() !== 200) throw new Error('E2E: server did not respond with 200 for /e2e-ping.html')
  await page.locator('#e2e-ping').waitFor({ state: 'attached', timeout: 5000 })
}

/**
 * Wait until our app page loaded and React rendered the shell.
 * 1) Wait for #e2e-marker (our index.html)
 * 2) Wait for data-e2e="1" (e2e=1 was in URL)
 * 3) Wait for #root to have content (React mounted)
 * 4) Wait for .app-loader to be gone and a.skip-link in DOM
 * @param {object} [options] - Optional { skipLinkTimeout: number } to override skip-link wait (ms).
 */
export async function waitForAppReady(page, options = {}) {
  const skipLinkTimeout = options.skipLinkTimeout ?? SKIP_LINK_TIMEOUT
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('load')

  const markerReady = page.locator('#e2e-marker[data-e2e="1"]')
  await page.evaluate(() => {
    if (typeof location !== 'undefined' && location.search.indexOf('e2e=1') !== -1) {
      try {
        const m = document.getElementById('e2e-marker')
        if (m) m.setAttribute('data-e2e', '1')
      } catch (e) {}
    }
  }).catch(() => {})
  await markerReady.waitFor({ state: 'attached', timeout: MARKER_TIMEOUT }).catch(async () => {
    const hasMarker = await page.locator('#e2e-marker').count() > 0
    if (hasMarker) throw new Error('E2E: Our page loaded but e2e=1 was not in URL. Tests must use gotoE2E() so URL has ?e2e=1.')
    throw new Error('E2E: #e2e-marker not found. Is the app served at baseURL? Start dev server (npm run dev) and ensure baseURL is http://localhost:5173.')
  })

  await page.locator('#root').locator('> *').first().waitFor({ state: 'attached', timeout: ROOT_MOUNT_TIMEOUT }).catch(() => {})

  await page.locator('.app-loader').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {})

  const skipLink = page.locator('a.skip-link')
  const mainContent = page.locator('#main-content')
  const found = await Promise.race([
    skipLink.waitFor({ state: 'attached', timeout: skipLinkTimeout }).then(() => 'skip-link'),
    mainContent.waitFor({ state: 'attached', timeout: skipLinkTimeout }).then(() => 'main-content'),
  ]).catch(() => null)
  if (!found) {
    throw new Error('E2E: Neither a.skip-link nor #main-content appeared. App may be stuck on loader or not rendered.')
  }
}
