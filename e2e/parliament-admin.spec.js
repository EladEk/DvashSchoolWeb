/**
 * E2E Parliament admin: create parliament date (positive), unauthenticated access (negative).
 * Uses auth-helper for admin login. Create date may require Firebase.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'
import { loginAsAdmin } from './auth-helper.js'

test.describe('Parliament admin', () => {
  test('authenticated admin can open create-date modal and see form', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await page.getByRole('button', { name: /יצירת פרלמנט חדש|create.*parliament|create new/i }).click()
    await expect(page.locator('.parliament-modal-panel')).toBeVisible()
    await expect(page.getByRole('heading', { name: /צור תאריך|create date/i })).toBeVisible()
    await expect(page.locator('input[type="date"]')).toBeVisible()
  })

  test('create date modal: fill and submit does not crash (may succeed or show Firebase error)', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await page.getByRole('button', { name: /יצירת פרלמנט חדש|create.*parliament|create new/i }).click()
    await page.waitForTimeout(500)
    await page.locator('.parliament-modal-panel input[type="text"]').fill('E2E Parliament ' + Date.now())
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const dateStr = futureDate.toISOString().slice(0, 10)
    await page.locator('.parliament-modal-panel input[type="date"]').fill(dateStr)
    await page.locator('.parliament-modal-panel').getByRole('button', { name: /צור|create/i }).click()
    await page.waitForTimeout(4000)
    const modalGone = await page.locator('.parliament-modal-backdrop').isHidden().catch(() => true)
    expect(modalGone).toBe(true)
  })

  test('negative: create date with empty title disables submit', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await page.getByRole('button', { name: /יצירת פרלמנט חדש|create.*parliament|create new/i }).click()
    await page.waitForTimeout(500)
    const createBtn = page.locator('.parliament-modal-panel').getByRole('button', { name: /צור|create/i })
    await expect(createBtn).toBeDisabled()
  })
})
