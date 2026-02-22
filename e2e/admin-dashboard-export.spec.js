/**
 * E2E Admin dashboard: export JSON, export DB (positive); unauthenticated (negative).
 * Uses auth-helper for admin. Export API may 404 in local E2E (no serverless); we assert no crash.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'
import { loginAsAdmin } from './auth-helper.js'

test.describe('Admin dashboard export', () => {
  test('negative: unauthenticated visit to /admin/dashboard redirects', async ({ page }) => {
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/(parliament\/login|unauthorized)/, { timeout: 10000 })
  })

  test('authenticated admin sees dashboard with export buttons', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    await expect(page.getByRole('button', { name: /Save JSON|הורד|export|save json/i })).toBeVisible({ timeout: 10000 })
  })

  test('Save JSON Files button exists and is clickable', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    const saveJsonBtn = page.getByRole('button', { name: /Save JSON|save json/i })
    await expect(saveJsonBtn).toBeVisible()
    await saveJsonBtn.click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.admin-dashboard, .export-btn')).toBeVisible()
  })

  test('Export all (Git + DB) button exists and is clickable', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    const exportAllBtn = page.getByRole('button', { name: /הורד הכל|export all|Git \+ DB/i })
    await expect(exportAllBtn).toBeVisible()
    await exportAllBtn.click()
    await page.waitForTimeout(3000)
    await expect(page.locator('.admin-dashboard, .export-btn')).toBeVisible()
  })

  test('אפס (Git → DB) button exists and is clickable', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    const resetBtn = page.getByRole('button', { name: 'אפס' })
    await expect(resetBtn).toBeVisible()
    // Cancel the confirm dialog so we don't actually reset DB
    page.once('dialog', (dialog) => dialog.dismiss())
    await resetBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('.admin-dashboard')).toBeVisible()
  })
})
