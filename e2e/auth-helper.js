/**
 * E2E auth helper: login as system admin (no Firebase required).
 * Also supports setSessionAsRole for testing role-based UI without Firebase.
 */
import { gotoE2E, waitForAppReady } from './helpers.js'

/**
 * Log in as system admin and wait for redirect to admin dashboard.
 * Uses the hardcoded system admin (admin / Panda123) from ParliamentLogin.
 * @param {import('@playwright/test').Page} page
 * @param {{ waitForDashboard?: boolean }} options - If true (default), wait for URL to contain /admin/dashboard
 */
export async function loginAsAdmin(page, options = {}) {
  const { waitForDashboard = true } = options
  await gotoE2E(page, '/parliament/login')
  await waitForAppReady(page)
  await page.locator('input[type="text"]').fill('admin')
  await page.locator('input[type="password"]').fill('Panda123')
  await page.locator('form').locator('button[type="submit"]').click()
  if (waitForDashboard) {
    await page.waitForURL(/\/(admin\/dashboard|admin\/parliament)/, { timeout: 15000 })
  }
}

/** Roles that can access admin dashboard (edit mode) */
const DASHBOARD_ROLES = ['admin', 'manager', 'editor']
/** Roles that can access parliament admin (dates, approve subjects) */
const PARLIAMENT_ADMIN_ROLES = ['admin', 'manager', 'committee']
/** Roles that can suggest subjects on parliament page */
const PARLIAMENT_SUGGEST_ROLES = ['student', 'parent', 'admin', 'manager', 'editor', 'committee']

/**
 * Set session as a given role without Firebase (E2E only).
 * Navigate to a page first so we have origin, then set localStorage + sessionStorage and reload or navigate.
 * @param {import('@playwright/test').Page} page
 * @param {'admin'|'manager'|'editor'|'committee'|'parent'|'student'} role
 */
export async function setSessionAsRole(page, role) {
  const r = String(role).toLowerCase()
  await gotoE2E(page, '/')
  await waitForAppReady(page)
  await page.evaluate((roleName) => {
    const uid = roleName === 'admin' ? 'system-admin' : `e2e-${roleName}-${Date.now()}`
    const session = {
      uid,
      id: uid,
      username: roleName,
      usernameLower: roleName,
      firstName: 'E2E',
      lastName: roleName,
      role: roleName,
      roles: [roleName],
      displayName: `E2E ${roleName}`,
      mode: roleName === 'admin' ? 'system-admin' : undefined,
    }
    localStorage.setItem('session', JSON.stringify(session))
    if (['admin', 'manager', 'editor'].includes(roleName)) {
      sessionStorage.setItem('adminAuthenticated', 'true')
    } else {
      sessionStorage.removeItem('adminAuthenticated')
    }
  }, r)
  await gotoE2E(page, '/parliament')
  await waitForAppReady(page)
}

/**
 * Set session as role and navigate to parliament admin (for roles that can manage dates/approve).
 * @param {import('@playwright/test').Page} page
 * @param {'admin'|'manager'|'committee'} role
 */
export async function setSessionAsParliamentAdminRole(page, role) {
  const r = String(role).toLowerCase()
  if (!PARLIAMENT_ADMIN_ROLES.includes(r)) throw new Error(`Role ${role} cannot access parliament admin`)
  await gotoE2E(page, '/')
  await waitForAppReady(page)
  await page.evaluate((roleName) => {
    const uid = roleName === 'admin' ? 'system-admin' : `e2e-${roleName}-${Date.now()}`
    const session = {
      uid,
      id: uid,
      username: roleName,
      usernameLower: roleName,
      firstName: 'E2E',
      lastName: roleName,
      role: roleName,
      roles: [roleName],
      displayName: `E2E ${roleName}`,
      mode: roleName === 'admin' ? 'system-admin' : undefined,
    }
    localStorage.setItem('session', JSON.stringify(session))
    sessionStorage.setItem('adminAuthenticated', 'true')
  }, r)
  await gotoE2E(page, '/admin/parliament')
  await waitForAppReady(page)
}

/**
 * Set session as role and navigate to admin dashboard (for roles that have edit access).
 * @param {import('@playwright/test').Page} page
 * @param {'admin'|'manager'|'editor'} role
 */
export async function setSessionAsDashboardRole(page, role) {
  const r = String(role).toLowerCase()
  if (!DASHBOARD_ROLES.includes(r)) throw new Error(`Role ${role} cannot access dashboard`)
  await gotoE2E(page, '/')
  await waitForAppReady(page)
  await page.evaluate((roleName) => {
    const uid = roleName === 'admin' ? 'system-admin' : `e2e-${roleName}-${Date.now()}`
    const session = {
      uid,
      id: uid,
      username: roleName,
      usernameLower: roleName,
      firstName: 'E2E',
      lastName: roleName,
      role: roleName,
      roles: [roleName],
      displayName: `E2E ${roleName}`,
      mode: roleName === 'admin' ? 'system-admin' : undefined,
    }
    localStorage.setItem('session', JSON.stringify(session))
    sessionStorage.setItem('adminAuthenticated', 'true')
  }, r)
  await gotoE2E(page, '/admin/dashboard')
  await waitForAppReady(page)
}
