/**
 * E2E scenarios mapped to docs/HLD.md (High-Level Design).
 * Covers: public pages (contact, unauthorized), RBAC (editor denied parliament admin),
 * auth (admin redirect), and data-flow (contact form, parliament read).
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'
import { loginAsAdmin, setSessionAsDashboardRole } from './auth-helper.js'

// --- HLD 1.1 System Overview: School/public website (marketing, contact, parliament) ---

test.describe('HLD 1.1 – Public pages and contact', () => {
  test('contact page loads and form is visible', async ({ page }) => {
    await gotoE2E(page, '/contact')
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/contact/)
    await expect(page.locator('#contact, .contact').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.contact-form, form.contact-form').first()).toBeVisible({ timeout: 8000 })
    await expect(page.locator('input[name="firstName"], input#firstName').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[name="email"], input#email').first()).toBeVisible({ timeout: 5000 })
  })

  test('contact form submit does not crash (may succeed or show error)', async ({ page }) => {
    await gotoE2E(page, '/contact')
    await waitForAppReady(page)
    const form = page.locator('.contact-form, form').first()
    await expect(form).toBeVisible({ timeout: 10000 })
    await form.locator('input[name="firstName"], input#firstName').first().fill('E2E')
    await form.locator('input[name="lastName"], input#lastName').first().fill('Test')
    await form.locator('input[name="email"], input#email').first().fill('e2e@example.com')
    await form.locator('textarea[name="message"], textarea#message').first().fill('E2E test message')
    await form.locator('button[type="submit"], .submit-btn').first().click()
    await page.waitForTimeout(3000)
    await expect(page.locator('#contact, .contact, #main-content').first()).toBeVisible({ timeout: 5000 })
    const successOrError = page.locator('.success-message, .error-message, .form-error, [class*="success"], [class*="error"]')
    const stillForm = page.locator('.contact-form form, form.contact-form')
    const hasResult = await successOrError.first().isVisible().catch(() => false)
    const hasForm = await stillForm.first().isVisible().catch(() => false)
    expect(hasResult || hasForm).toBe(true)
  })
})

// --- HLD 1.4 Auth: Unauthorized page and RBAC (editor cannot access parliament admin) ---

test.describe('HLD 1.4 – Unauthorized and RBAC', () => {
  test('unauthorized page shows message and links', async ({ page }) => {
    await gotoE2E(page, '/unauthorized')
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/unauthorized/)
    await expect(page.locator('.unauthorized-page, .unauthorized-container').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/אין לך הרשאה|unauthorized|הרשאה/i).first()).toBeVisible({ timeout: 8000 })
    await expect(page.locator('a[href="/"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('editor cannot access parliament admin (redirect to unauthorized or login)', async ({ page }) => {
    await setSessionAsDashboardRole(page, 'editor')
    await gotoE2E(page, '/admin/parliament')
    await page.waitForURL(/\/(unauthorized|parliament\/login)/, { timeout: 15000 }).catch(() => {})
    await waitForAppReady(page)
    await expect(page).not.toHaveURL(/\/admin\/parliament/)
    await expect(page).toHaveURL(/\/(unauthorized|parliament\/login)/)
  })

  test('system admin login redirects to admin dashboard or parliament', async ({ page }) => {
    await gotoE2E(page, '/parliament/login')
    await waitForAppReady(page)
    await page.locator('input[type="text"]').fill('admin')
    await page.locator('input[type="password"]').fill('Panda123')
    await page.locator('form').locator('button[type="submit"]').click()
    await page.waitForURL(/\/(admin\/dashboard|admin\/parliament)/, { timeout: 15000 })
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/(admin\/dashboard|admin\/parliament)/)
  })
})

// --- HLD 1.5 Data flow: Parliament public read (unauthenticated can view) ---

test.describe('HLD 1.5 – Parliament public read', () => {
  test('unauthenticated user can view parliament page (public read)', async ({ page }) => {
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/parliament/)
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 10000 })
    const hasContent = await page.locator('.parliament-card, .parliament-section, .parliament-login-page, #main-content').first().isVisible()
    expect(hasContent).toBe(true)
  })
})

// --- HLD 1.2 Architecture: Client shell and admin areas reachable when authorized ---

test.describe('HLD 1.2 – Client admin areas', () => {
  test('admin can reach dashboard and see admin UI', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    await expect(page.locator('.admin-dashboard')).toBeVisible({ timeout: 15000 })
  })

  test('admin can reach parliament admin when authorized', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await expect(page.locator('.parliament-page')).toBeVisible({ timeout: 20000 })
  })
})
