/**
 * E2E Parliament register: form visibility, validation (negative), optional success.
 * Uses ?e2e=1 and shared helpers. Register success may require Firebase/test user.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'

test.describe('Parliament register', () => {
  test('register tab shows registration form', async ({ page }) => {
    await gotoE2E(page, '/parliament/login')
    await waitForAppReady(page)
    await page.getByRole('button', { name: /הירשם|register/i }).click()
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
    await expect(page.locator('input[autocomplete="new-password"]').first()).toBeVisible()
    await expect(page.locator('input[autocomplete="given-name"]')).toBeVisible()
  })

  test('negative: password mismatch shows error', async ({ page }) => {
    await gotoE2E(page, '/parliament/login')
    await waitForAppReady(page)
    await page.getByRole('button', { name: /הירשם|register/i }).click()
    await page.locator('input[autocomplete="username"]').fill('testuser')
    await page.locator('input[autocomplete="given-name"]').fill('Test')
    await page.locator('input[autocomplete="family-name"]').fill('User')
    await page.locator('select').selectOption('student')
    await page.locator('input[type="password"]').first().fill('pass1234')
    await page.locator('input[type="password"]').nth(1).fill('pass9999')
    await page.locator('form').locator('button[type="submit"]').click()
    await expect(page.locator('.parliament-error')).toContainText(/לא תואמות|mismatch|תואם/i)
  })

  test('negative: short password shows error', async ({ page }) => {
    await gotoE2E(page, '/parliament/login')
    await waitForAppReady(page)
    await page.getByRole('button', { name: /הירשם|register/i }).click()
    await page.locator('input[autocomplete="username"]').fill('testuser')
    await page.locator('input[autocomplete="given-name"]').fill('Test')
    await page.locator('input[autocomplete="family-name"]').fill('User')
    await page.locator('select').selectOption('student')
    await page.locator('input[type="password"]').first().fill('ab')
    await page.locator('input[type="password"]').nth(1).fill('ab')
    await page.locator('form').locator('button[type="submit"]').click()
    await page.waitForTimeout(1500)
    const stillOnRegister = await page.locator('input[autocomplete="new-password"]').first().isVisible().catch(() => false)
    const hasError = await page.locator('.parliament-error').isVisible().catch(() => false)
    expect(stillOnRegister || hasError).toBe(true)
  })

  test('negative: empty required fields keep user on register (no redirect)', async ({ page }) => {
    await gotoE2E(page, '/parliament/login')
    await waitForAppReady(page)
    await page.getByRole('button', { name: /הירשם|register/i }).click()
    await page.locator('form').locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/parliament\/login/)
    await expect(page.locator('.parliament-login-container')).toBeVisible()
  })

  test('register form submit does not crash (may show success or connection/username error)', async ({ page }) => {
    await gotoE2E(page, '/parliament/login')
    await waitForAppReady(page)
    await page.getByRole('button', { name: /הירשם|register/i }).click()
    await page.locator('input[autocomplete="username"]').fill('e2eunique' + Date.now())
    await page.locator('input[autocomplete="given-name"]').fill('E2E')
    await page.locator('input[autocomplete="family-name"]').fill('User')
    await page.locator('select').selectOption('student')
    await page.locator('input[type="password"]').first().fill('pass1234')
    await page.locator('input[type="password"]').nth(1).fill('pass1234')
    await page.locator('form').locator('button[type="submit"]').click()
    await page.waitForTimeout(5000)
    await expect(page).toHaveURL(/\/parliament/)
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 10000 })
  })
})
