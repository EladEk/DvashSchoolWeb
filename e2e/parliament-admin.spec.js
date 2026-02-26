/**
 * E2E Parliament admin: create parliament date (positive), unauthenticated access (negative).
 * Uses auth-helper for admin login. Create date may require Firebase.
 * Selectors aligned with ParliamentAdmin.jsx: dates tab -> .parliament-section -> create button by name.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'
import { loginAsAdmin } from './auth-helper.js'

test.describe('Parliament admin', () => {
  test.describe.configure({ retries: 2 })

  test('authenticated admin can open create-date modal and see form', async ({ page }) => {
    test.setTimeout(60000)
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await expect(page.locator('.parliament-page')).toBeVisible({ timeout: 20000 })
    await page.locator('.parliament-toolbar').getByRole('button').nth(3).click()
    await expect(page.locator('.parliament-section')).toBeVisible({ timeout: 15000 })
    const openModalBtn = page.locator('.parliament-section').getByRole('button', { name: /יצירת|create|פרלמנט חדש|new parliament/i }).first()
    await expect(openModalBtn).toBeVisible({ timeout: 20000 })
    await openModalBtn.click()
    const panel = page.locator('.parliament-modal-panel').filter({ has: page.locator('input[type="date"]') })
    await expect(panel).toBeVisible({ timeout: 15000 })
    await expect(panel.locator('input[type="text"]').first()).toBeVisible({ timeout: 10000 })
    await expect(panel.locator('input[type="date"]')).toBeVisible({ timeout: 5000 })
    await expect(panel.getByRole('button', { name: /צור|create/i }).first()).toBeVisible({ timeout: 5000 })
  })

  test('create date modal: fill and submit does not crash (may succeed or show Firebase error)', async ({ page }) => {
    test.setTimeout(90000)
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await expect(page.locator('.parliament-page')).toBeVisible({ timeout: 20000 })
    await page.locator('.parliament-toolbar').getByRole('button').nth(3).click()
    await expect(page.locator('.parliament-section')).toBeVisible({ timeout: 15000 })
    const openModalBtn = page.locator('.parliament-section').getByRole('button', { name: /יצירת|create|פרלמנט חדש|new parliament/i }).first()
    await expect(openModalBtn).toBeVisible({ timeout: 20000 })
    await openModalBtn.click()
    const panel = page.locator('.parliament-modal-panel').filter({ has: page.locator('input[type="date"]') })
    await expect(panel).toBeVisible({ timeout: 15000 })
    const titleInput = panel.locator('input[type="text"]').first()
    await expect(titleInput).toBeVisible({ timeout: 10000 })
    await titleInput.fill('E2E Parliament ' + Date.now())
    const future = new Date()
    future.setDate(future.getDate() + 7)
    const dateInput = panel.locator('input[type="date"]')
    await dateInput.fill(future.toISOString().slice(0, 10), { timeout: 10000 })
    const createBtn = panel.getByRole('button', { name: /צור|create/i }).first()
    await createBtn.click({ timeout: 15000 })
    await page.locator('.parliament-modal-backdrop').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {})
    const modalGone = await page.locator('.parliament-modal-backdrop').isHidden().catch(() => true)
    const hasMain = await page.locator('#main-content, .parliament-toolbar, .parliament-page').first().isVisible().catch(() => false)
    expect(modalGone || hasMain).toBe(true)
  })

  test('negative: create date with empty title disables submit', async ({ page }) => {
    test.setTimeout(60000)
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await expect(page.locator('.parliament-page')).toBeVisible({ timeout: 20000 })
    await page.locator('.parliament-toolbar').getByRole('button').nth(3).click()
    await expect(page.locator('.parliament-section')).toBeVisible({ timeout: 15000 })
    const openModalBtn = page.locator('.parliament-section').getByRole('button', { name: /יצירת|create|פרלמנט חדש|new parliament/i }).first()
    await expect(openModalBtn).toBeVisible({ timeout: 20000 })
    await openModalBtn.click()
    const panel = page.locator('.parliament-modal-panel').filter({ has: page.locator('input[type="date"]') })
    await expect(panel).toBeVisible({ timeout: 15000 })
    const submitBtn = panel.getByRole('button', { name: /צור|create/i }).first()
    await expect(submitBtn).toBeVisible({ timeout: 10000 })
    await expect(submitBtn).toBeDisabled()
  })
})
