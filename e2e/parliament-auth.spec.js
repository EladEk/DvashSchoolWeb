/**
 * E2E Parliament and auth: login form, invalid credentials, protected routes redirect.
 * Uses ?e2e=1 and shared helpers so the app recognizes test env.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'

test.describe('Parliament login', () => {
  test('parliament login page shows form', async ({ page }) => {
    await gotoE2E(page, '/parliament/login')
    await waitForAppReady(page)
    await page.locator('input[type="password"]').waitFor({ state: 'visible', timeout: 10000 })
    await expect(page.locator('form')).toBeVisible()
  })

  test('invalid credentials show error or do not redirect to dashboard', async ({ page }) => {
    await gotoE2E(page, '/parliament/login')
    await waitForAppReady(page)
    await page.locator('input[type="password"]').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('input[type="text"]').fill('invaliduser')
    await page.locator('input[type="password"]').fill('wrongpass')
    await page.locator('form').locator('button[type="submit"]').click()
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain('/admin/dashboard')
  })

  test('negative: invalid login shows error message', async ({ page }) => {
    await gotoE2E(page, '/parliament/login')
    await waitForAppReady(page)
    await page.locator('input[type="text"]').fill('nonexistentuser')
    await page.locator('input[type="password"]').fill('wrongpass')
    await page.locator('form').locator('button[type="submit"]').click()
    await expect(page.locator('.parliament-error')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.parliament-error')).not.toBeEmpty()
  })
})

test.describe('Protected routes', () => {
  test('unauthenticated visit to /admin/dashboard redirects to login or unauthorized', async ({ page }) => {
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/(parliament\/login|unauthorized)/, { timeout: 10000 })
  })

  test('negative: unauthenticated visit to /admin/parliament redirects', async ({ page }) => {
    await gotoE2E(page, '/admin/parliament')
    await page.waitForTimeout(3000)
    await waitForAppReady(page)
    await expect(page).not.toHaveURL(/\/admin\/parliament/)
  })
})
