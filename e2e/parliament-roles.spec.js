/**
 * E2E Parliament by role: student, parent, committee, editor, manager, admin can suggest/add note.
 * Unauthenticated sees "login to submit"; logged-in with allowed role sees subject form or no-open-dates.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'
import { setSessionAsRole, loginAsAdmin } from './auth-helper.js'

const ROLES_THAT_CAN_SUGGEST = ['student', 'parent', 'committee', 'editor', 'manager', 'admin']

test.describe('Parliament suggest by role', () => {
  test('unauthenticated: parliament shows content and login-to-submit message or suggest form', async ({ page }) => {
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/parliament/)
    const mainContent = page.locator('#main-content, .parliament-card, .parliament-section')
    await expect(mainContent.first()).toBeVisible({ timeout: 10000 })
    const loginPrompt = page.getByText(/התחבר|login to submit|להציע נושאים/i)
    const suggestArea = page.locator('form.parliament-card, .parliament-card')
    const hasLoginPrompt = await loginPrompt.isVisible().catch(() => false)
    const hasSuggestArea = await suggestArea.first().isVisible().catch(() => false)
    expect(hasLoginPrompt || hasSuggestArea).toBe(true)
  })

  test('student: parliament shows headline and subject form or no-open-dates', async ({ page }) => {
    await setSessionAsRole(page, 'student')
    await expect(page.getByText(/הציעו|פרלמנט|parliament|נושא/i).first()).toBeVisible({ timeout: 10000 })
    const formOrMessage = page.locator('form.parliament-card, .parliament-card').first()
    await expect(formOrMessage).toBeVisible({ timeout: 8000 })
  })

  test('parent: parliament shows subject form or no-open-dates message', async ({ page }) => {
    await setSessionAsRole(page, 'parent')
    await expect(page.getByText(/הציעו|פרלמנט|parliament|נושא/i).first()).toBeVisible({ timeout: 10000 })
    const formOrCard = page.locator('form.parliament-card, .parliament-card').first()
    await expect(formOrCard).toBeVisible({ timeout: 8000 })
  })

  test('committee: parliament shows subject form or no-open-dates', async ({ page }) => {
    await setSessionAsRole(page, 'committee')
    await expect(page.getByText(/הציעו|פרלמנט|parliament|נושא/i).first()).toBeVisible({ timeout: 10000 })
    const formOrCard = page.locator('form.parliament-card, .parliament-card').first()
    await expect(formOrCard).toBeVisible({ timeout: 8000 })
  })

  test('admin: parliament shows subject form or no-open-dates', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await expect(page.getByText(/הציעו|פרלמנט|parliament|נושא/i).first()).toBeVisible({ timeout: 10000 })
    const formOrCard = page.locator('form.parliament-card, .parliament-card').first()
    await expect(formOrCard).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Parliament add note / discuss', () => {
  test('logged-in user sees discuss or subject list or empty state', async ({ page }) => {
    await setSessionAsRole(page, 'student')
    await expect(page.locator('.parliament-section, form.parliament-card, .parliament-card, .parliament-empty').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Parliament admin access by role', () => {
  test('admin can access parliament admin page', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await expect(page.locator('.parliament-page')).toBeVisible({ timeout: 20000 })
  })

  test('committee can access parliament admin (dates/approve)', async ({ page }) => {
    await gotoE2E(page, '/')
    await waitForAppReady(page)
    await page.evaluate(() => {
      const session = {
        uid: 'e2e-committee',
        id: 'e2e-committee',
        username: 'committee',
        usernameLower: 'committee',
        firstName: 'E2E',
        lastName: 'Committee',
        role: 'committee',
        roles: ['committee'],
        displayName: 'E2E Committee',
      }
      localStorage.setItem('session', JSON.stringify(session))
      sessionStorage.setItem('adminAuthenticated', 'true')
    })
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await expect(page.locator('.parliament-page')).toBeVisible({ timeout: 20000 })
  })

  test('student cannot access admin dashboard (redirect)', async ({ page }) => {
    await setSessionAsRole(page, 'student')
    await gotoE2E(page, '/admin/dashboard')
    await page.waitForURL(/\/(parliament\/login|unauthorized)/, { timeout: 15000 }).catch(() => {})
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/(parliament\/login|unauthorized)/)
  })
})
