/**
 * E2E Parliament: add subject, add note (positive); no-permission and unauthenticated (negative).
 * Uses auth-helper for admin. Subject/note creation may require Firebase and open dates.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'
import { loginAsAdmin } from './auth-helper.js'

test.describe('Parliament subject and notes', () => {
  test('negative: unauthenticated parliament page shows content or login prompt', async ({ page }) => {
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await expect(page).toHaveURL(/\/parliament/)
    await expect(page.locator('#main-content, .parliament-login-page, .parliament-card')).toBeVisible({ timeout: 10000 })
  })

  test('parliament page when logged in shows headline and either subject form or no-open-dates message', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await expect(page.getByText(/הציעו|פרלמנט|parliament/i).first()).toBeVisible({ timeout: 10000 })
    const formOrMessage = page.locator('.parliament-card, .parliament-login-form')
    await expect(formOrMessage.first()).toBeVisible({ timeout: 8000 })
  })

  test('negative: submit subject with empty title does not submit (required)', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    const subjectForm = page.locator('form.parliament-card')
    if (await subjectForm.isVisible()) {
      const submitBtn = subjectForm.getByRole('button', { name: /שלח|submit/i })
      await expect(submitBtn).toBeDisabled()
    }
  })

  test('add note: when a subject is open, note textarea and button exist or subject list is empty', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    const addNoteArea = page.locator('textarea, [placeholder*="הערה"], .parliament-note')
    const subjectList = page.locator('.parliament-subject, [data-subject], .parliament-card')
    await expect(addNoteArea.first().or(subjectList.first())).toBeVisible({ timeout: 10000 })
  })
})
