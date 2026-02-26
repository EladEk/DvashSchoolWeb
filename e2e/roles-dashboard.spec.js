/**
 * E2E Role-based dashboard: editor sees translation tab only; manager/admin see users tab too.
 * Edit mode and texts: translation editor tab, language selector, export buttons per role.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'
import { setSessionAsDashboardRole, loginAsAdmin } from './auth-helper.js'

test.describe('Dashboard by role', () => {
  test('admin sees dashboard with translation and users tabs', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    await expect(page.locator('.admin-dashboard')).toBeVisible({ timeout: 15000 })
    const nav = page.locator('.admin-nav')
    await expect(nav).toBeVisible({ timeout: 10000 })
    const tabs = nav.getByRole('button')
    await expect(tabs).toHaveCount(2)
  })

  test('manager sees dashboard with translation and users tabs', async ({ page }) => {
    await setSessionAsDashboardRole(page, 'manager')
    await expect(page.locator('.admin-dashboard')).toBeVisible({ timeout: 15000 })
    const nav = page.locator('.admin-nav')
    await expect(nav).toBeVisible({ timeout: 10000 })
    await expect(nav.getByRole('button')).toHaveCount(2)
  })

  test('editor sees dashboard with translation tab only (no users)', async ({ page }) => {
    await setSessionAsDashboardRole(page, 'editor')
    await expect(page.locator('.admin-dashboard')).toBeVisible({ timeout: 15000 })
    const nav = page.locator('.admin-nav')
    await expect(nav).toBeVisible({ timeout: 10000 })
    await expect(nav.getByRole('button')).toHaveCount(1)
  })

  test('edit mode: translation editor tab is clickable', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    const transTab = page.locator('.admin-nav').getByRole('button').first()
    await expect(transTab).toBeVisible({ timeout: 15000 })
    await transTab.click()
    await page.waitForTimeout(500)
    await expect(page.locator('.admin-dashboard')).toBeVisible()
  })

  test('edit mode: language selector (Hebrew/English) visible', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/dashboard')
    await waitForAppReady(page)
    const dashboard = page.locator('.admin-dashboard')
    await expect(dashboard.locator('.lang-selector').getByRole('button').first()).toBeVisible({ timeout: 15000 })
    await expect(dashboard.locator('.lang-selector').getByRole('button').last()).toBeVisible()
  })
})
