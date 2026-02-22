/**
 * E2E auth helper: login as system admin (no Firebase required).
 * System admin: username "admin", password "Panda123" → redirects to /admin/dashboard.
 */
import { gotoE2E, waitForAppReady } from './helpers.js'

/**
 * Log in as system admin and wait for redirect to admin dashboard.
 * Uses the hardcoded system admin (admin / Panda123) from ParliamentLogin.
 * @param {import('@playwright/test').Page} page
 * @param {{ waitForDashboard?: boolean }} options - If true (default), wait for URL to contain /admin/dashboard
 */
export async function loginAsAdmin(page, options = {}) {
  const { waitForDashboard = true } = options
  await gotoE2E(page, '/parliament/login')
  await waitForAppReady(page)
  await page.locator('input[type="text"]').fill('admin')
  await page.locator('input[type="password"]').fill('Panda123')
  await page.locator('form').locator('button[type="submit"]').click()
  if (waitForDashboard) {
    await page.waitForURL(/\/(admin\/dashboard|admin\/parliament)/, { timeout: 15000 })
  }
}
