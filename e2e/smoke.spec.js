/**
 * E2E smoke and routing: Home, FAQ, Contact, Parliament, redirects, 404.
 * Uses ?e2e=1 and #e2e-marker so the app recognizes test env and skips translation load.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'

test.describe('Smoke and routing', () => {
  test('E2E env: server serves app and e2e marker is set', async ({ page }) => {
    await gotoE2E(page, '/')
    await waitForAppReady(page)
  })

  test('home page loads and has main content', async ({ page }) => {
    await gotoE2E(page, '/')
    await waitForAppReady(page)
    await expect(page.locator('#main-content')).toBeVisible()
  })

  test('FAQ page loads', async ({ page }) => {
    await gotoE2E(page, '/')
    await waitForAppReady(page)
    await page.locator('a[href="/FAQ"]').first().click()
    await expect(page).toHaveURL(/\/FAQ/, { timeout: 10000 })
  })

  test('contact page loads at /contact and /contact-8', async ({ page }) => {
    await gotoE2E(page, '/contact')
    await waitForAppReady(page)
    await gotoE2E(page, '/contact-8')
    await waitForAppReady(page)
  })

  test('parent-committee and parents-association load', async ({ page }) => {
    await gotoE2E(page, '/parent-committee')
    await waitForAppReady(page)
    await gotoE2E(page, '/parents-association')
    await waitForAppReady(page)
  })

  test('parliament page loads', async ({ page }) => {
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
  })

  test('/admin redirects to /parliament/login', async ({ page }) => {
    await gotoE2E(page, '/admin')
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/parliament\/login/, { timeout: 10000 })
  })

  test('unknown path shows page not found', async ({ page }) => {
    await gotoE2E(page, '/nonexistent-page-xyz')
    await waitForAppReady(page)
    await page.getByText(/page not found|לא נמצא/i).waitFor({ state: 'visible', timeout: 10000 })
    await expect(page.getByText(/page not found|לא נמצא/i)).toBeVisible()
  })
})
