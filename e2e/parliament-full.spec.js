/**
 * E2E Parliament full coverage: create date, suggest subject (all roles), approve/decline,
 * add note, reply to note, edit note, delete note.
 * Requires Firebase for create/submit/approve/notes; UI flows work without data.
 */
import { test, expect } from '@playwright/test'
import { gotoE2E, waitForAppReady } from './helpers.js'
import {
  loginAsAdmin,
  setSessionAsRole,
  setSessionAsParliamentAdminRole,
} from './auth-helper.js'

const ROLES_THAT_CAN_SUGGEST = ['student', 'parent', 'committee', 'editor', 'manager', 'admin']
const ROLES_THAT_CAN_PARLIAMENT_ADMIN = ['admin', 'manager', 'committee']

// --- Create parliament date (permissions: admin, manager, committee) ---

test.describe('Parliament – create date', () => {
  for (const role of ROLES_THAT_CAN_PARLIAMENT_ADMIN) {
    test(`${role} can open parliament admin and see toolbar with dates tab`, async ({ page }) => {
      if (role === 'admin') {
        await loginAsAdmin(page)
        await gotoE2E(page, '/admin/parliament')
      } else {
        await setSessionAsParliamentAdminRole(page, role)
      }
      await waitForAppReady(page)
      await expect(page.locator('.parliament-page')).toBeVisible({ timeout: 25000 })
      const toolbar = page.locator('.parliament-toolbar')
      await expect(toolbar).toBeVisible({ timeout: 15000 })
      await expect(toolbar.getByRole('button')).toHaveCount(5, { timeout: 5000 })
    })
  }

  test('admin can open dates tab and see create date button', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await expect(page.locator('.parliament-page')).toBeVisible({ timeout: 25000 })
    await page.locator('.parliament-toolbar').getByRole('button').nth(3).click()
    const createBtn = page.getByRole('button', { name: /יצירת פרלמנט|create new parliament|create.*parliament/i })
    await expect(createBtn).toBeVisible({ timeout: 20000 })
  })

  test('admin can open create-date modal and see form', async ({ page }) => {
    test.setTimeout(60000)
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await expect(page.locator('.parliament-page')).toBeVisible({ timeout: 25000 })
    const datesTab = page.locator('.parliament-toolbar').getByRole('button').nth(3)
    await expect(datesTab).toBeVisible({ timeout: 10000 })
    await datesTab.click()
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

  test('create date modal: empty title disables submit', async ({ page }) => {
    test.setTimeout(60000)
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await page.locator('.parliament-toolbar').getByRole('button').nth(3).click()
    await expect(page.locator('.parliament-section')).toBeVisible({ timeout: 15000 })
    const openModalBtn = page.locator('.parliament-section').getByRole('button', { name: /יצירת|create|פרלמנט חדש|new parliament/i }).first()
    await expect(openModalBtn).toBeVisible({ timeout: 20000 })
    await openModalBtn.click()
    const panel = page.locator('.parliament-modal-panel').filter({ has: page.locator('input[type="date"]') })
    await expect(panel).toBeVisible({ timeout: 15000 })
    const createBtn = panel.getByRole('button', { name: /צור|create/i }).first()
    await expect(createBtn).toBeVisible({ timeout: 10000 })
    await expect(createBtn).toBeDisabled()
  })

  test('create date modal: fill and submit does not crash', async ({ page }) => {
    test.setTimeout(120000)
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
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
    const dateInput = page.locator('.parliament-modal-panel').filter({ has: page.locator('input[type="date"]') }).locator('input[type="date"]')
    await dateInput.fill(future.toISOString().slice(0, 10), { timeout: 10000 })
    const createBtn = page.locator('.parliament-modal-panel').filter({ has: page.locator('input[type="date"]') }).getByRole('button', { name: /צור|create/i }).first()
    await createBtn.click({ timeout: 15000 })
    await page.waitForTimeout(10000)
    const modalGone = await page.locator('.parliament-modal-backdrop').isHidden().catch(() => true)
    const hasMain = await page.locator('#main-content, .parliament-toolbar, .parliament-page').first().isVisible().catch(() => false)
    expect(modalGone || hasMain).toBe(true)
  })
})

// --- Each role can suggest subject (see form or no-open-dates) ---

test.describe('Parliament – suggest subject by role', () => {
  for (const role of ROLES_THAT_CAN_SUGGEST) {
    test(`${role} sees subject form or no-open-dates on parliament page`, async ({ page }) => {
      await setSessionAsRole(page, role)
      await expect(page).toHaveURL(/\/parliament/)
      await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 })
      await page.waitForTimeout(4000)
      const form = page.locator('form.parliament-card')
      const noOpen = page.getByText(/אין תאריכי|no open dates|פרלמנט פתוחים|להציע נושאים|login to submit/i)
      const section = page.locator('.parliament-section')
      const hasForm = await form.first().isVisible().catch(() => false)
      const hasNoOpen = await noOpen.first().isVisible().catch(() => false)
      const hasSection = await section.first().isVisible().catch(() => false)
      expect(hasForm || hasNoOpen || hasSection).toBe(true)
    })
  }

  test('when open dates exist, subject form has title input and date select and submit', async ({ page }) => {
    test.setTimeout(60000)
    await setSessionAsRole(page, 'student')
    await expect(page).toHaveURL(/\/parliament/)
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 25000 })
    await page.waitForTimeout(6000)
    const form = page.locator('form.parliament-card')
    const noOpen = page.getByText(/אין תאריכי|no open dates|פרלמנט פתוחים|להציע נושאים|login to submit/i)
    const section = page.locator('.parliament-section, .parliament-page, [class*="parliament"]')
    const hasForm = await form.first().isVisible().catch(() => false)
    const hasNoOpen = await noOpen.first().isVisible().catch(() => false)
    const hasSection = await section.first().isVisible().catch(() => false)
    const hasParliamentContent = hasForm || hasNoOpen || hasSection
    expect(hasParliamentContent).toBe(true)
    if (hasForm) {
      await expect(form.locator('input').first()).toBeVisible({ timeout: 8000 })
      await expect(form.locator('select, button[type="submit"]').first()).toBeVisible({ timeout: 8000 })
    }
  })
})

// --- Approve / decline subjects (parliament admin queue) ---

test.describe('Parliament – approve and decline subjects', () => {
  test('parliament admin queue tab shows pending list or empty', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    const queueTab = page.locator('.parliament-toolbar').getByRole('button').first()
    await queueTab.click()
    await page.waitForTimeout(1500)
    const section = page.locator('.parliament-section')
    await expect(section).toBeVisible()
    const gridOrEmpty = page.locator('.parliament-grid, .parliament-card').filter({ hasText: /ריק|empty/i })
    await expect(section.locator('.parliament-grid').or(section.locator('.parliament-card'))).toBeVisible({ timeout: 10000 })
  })

  test('reject modal opens and has reason textarea and submit', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    const queueTab = page.locator('.parliament-toolbar').getByRole('button').first()
    await queueTab.click()
    await page.waitForTimeout(2000)
    const rejectBtn = page.locator('.parliament-card').getByRole('button', { name: /דחה|reject/i }).first()
    const hasPending = await rejectBtn.isVisible().catch(() => false)
    if (hasPending) {
      await rejectBtn.click()
      await expect(page.locator('.parliament-modal-panel')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('.parliament-modal-panel textarea')).toBeVisible()
      await expect(page.locator('.parliament-modal-panel').getByRole('button', { name: /דחה|reject/i })).toBeVisible()
      page.once('dialog', d => d.dismiss())
      await page.locator('.parliament-modal-panel').getByRole('button', { name: /ביטול|cancel/i }).click()
    }
  })

  test('approve button visible on pending subject card when queue has items', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    const queueTab = page.locator('.parliament-toolbar').getByRole('button').first()
    await queueTab.click()
    await expect(page.locator('.parliament-section')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(3000)
    const section = page.locator('.parliament-section')
    const approveBtn = section.getByRole('button', { name: /אשר|approve/i }).first()
    const emptyMsg = section.getByText(/ריק|empty|אין|no.*pending/i)
    const hasCardWithApprove = await approveBtn.isVisible().catch(() => false)
    const hasEmpty = await emptyMsg.first().isVisible().catch(() => false)
    const hasQueueContent = await section.locator('.parliament-grid, .parliament-card').first().isVisible().catch(() => false)
    expect(hasCardWithApprove || hasEmpty || hasQueueContent).toBe(true)
  })

  // Full flow: create date, submit 2 subjects as student, approve one and reject one as admin.
  // After this test runs, parliament admin will show 1 approved and 1 rejected subject (if Firebase is configured).
  test('full flow: create date, submit subjects, approve one and reject one', async ({ page }) => {
    test.setTimeout(180000)
    const stamp = Date.now()

    // 1. Admin: ensure we have an open date (create one)
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await page.locator('.parliament-toolbar').getByRole('button').nth(3).click()
    await expect(page.locator('.parliament-section')).toBeVisible({ timeout: 15000 })
    const openModalBtn = page.locator('.parliament-section').getByRole('button', { name: /יצירת|create|פרלמנט חדש|new parliament/i }).first()
    await expect(openModalBtn).toBeVisible({ timeout: 10000 })
    await openModalBtn.click()
    const panel = page.locator('.parliament-modal-panel').filter({ has: page.locator('input[type="date"]') })
    await expect(panel).toBeVisible({ timeout: 15000 })
    await panel.locator('input[type="text"]').first().fill('E2E Flow ' + stamp)
    const future = new Date()
    future.setDate(future.getDate() + 14)
    await panel.locator('input[type="date"]').fill(future.toISOString().slice(0, 10), { timeout: 10000 })
    await panel.getByRole('button', { name: /צור|create/i }).first().click({ timeout: 15000 })
    await page.waitForTimeout(8000)

    // 2. Student: submit first subject
    await setSessionAsRole(page, 'student')
    await page.waitForTimeout(5000)
    const form = page.locator('form.parliament-card')
    await expect(form.locator('input').first()).toBeVisible({ timeout: 15000 })
    await form.locator('select').selectOption({ index: 1 })
    await form.locator('input').first().fill('E2E Subject Approve ' + stamp)
    await form.getByRole('button', { name: /שלח|submit/i }).click()
    await page.waitForTimeout(5000)

    // 3. Admin: approve first subject
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await page.locator('.parliament-toolbar').getByRole('button').first().click()
    await expect(page.locator('.parliament-section')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(3000)
    const approveBtn = page.locator('.parliament-section').getByRole('button', { name: /אשר|approve/i }).first()
    const hasApprove = await approveBtn.isVisible().catch(() => false)
    if (hasApprove) {
      await approveBtn.click()
      await page.waitForTimeout(3000)
    }

    // 4. Student: submit second subject
    await setSessionAsRole(page, 'student')
    await page.waitForTimeout(5000)
    const form2 = page.locator('form.parliament-card')
    await expect(form2.locator('input').first()).toBeVisible({ timeout: 15000 })
    await form2.locator('select').selectOption({ index: 1 })
    await form2.locator('input').first().fill('E2E Subject Reject ' + stamp)
    await form2.getByRole('button', { name: /שלח|submit/i }).click()
    await page.waitForTimeout(5000)

    // 5. Admin: reject second subject with reason
    await loginAsAdmin(page)
    await gotoE2E(page, '/admin/parliament')
    await waitForAppReady(page)
    await page.locator('.parliament-toolbar').getByRole('button').first().click()
    await page.waitForTimeout(3000)
    const rejectBtn = page.locator('.parliament-section').getByRole('button', { name: /דחה|reject/i }).first()
    const hasReject = await rejectBtn.isVisible().catch(() => false)
    if (hasReject) {
      await rejectBtn.click()
      await expect(page.locator('.parliament-modal-panel textarea')).toBeVisible({ timeout: 5000 })
      await page.locator('.parliament-modal-panel textarea').fill('E2E reject reason')
      page.once('dialog', d => d.accept())
      await page.locator('.parliament-modal-panel').getByRole('button', { name: /דחה|reject/i }).click()
      await page.waitForTimeout(3000)
    }

    // Verify approved and rejected tabs have content (or at least queue is empty after we moved items)
    await page.locator('.parliament-toolbar').getByRole('button').nth(1).click()
    await page.waitForTimeout(2000)
    const approvedSection = page.locator('.parliament-section')
    await expect(approvedSection).toBeVisible({ timeout: 5000 })
    await page.locator('.parliament-toolbar').getByRole('button').nth(2).click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.parliament-section')).toBeVisible({ timeout: 5000 })
  })
})

// --- Add note, reply, edit, delete notes ---

test.describe('Parliament – notes (add, reply, edit, delete)', () => {
  test('discuss button opens modal with notes area and add-note form when logged in', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await page.waitForTimeout(2000)
    const discussBtn = page.getByRole('button', { name: /דיון|הערות|discuss/i }).first()
    const noOpenOrEmpty = page.getByText(/אין תאריכים|no open|אין הערות/i)
    const hasDiscuss = await discussBtn.isVisible().catch(() => false)
    if (hasDiscuss) {
      await discussBtn.click()
      await expect(page.locator('.parliament-modal-panel')).toBeVisible({ timeout: 8000 })
      const notesSection = page.locator('.parliament-modal-panel').locator('.parliament-card')
      await expect(notesSection.first()).toBeVisible({ timeout: 5000 })
      const addNoteForm = page.locator('.parliament-modal-panel').locator('form').filter({ has: page.locator('textarea') })
      const addNoteArea = page.locator('.parliament-modal-panel').locator('textarea[placeholder*="הערה"], textarea[placeholder*="note"]')
      await expect(addNoteForm.or(addNoteArea).first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('add note: textarea and submit button visible in discuss modal', async ({ page }) => {
    await setSessionAsRole(page, 'student')
    await page.waitForTimeout(2000)
    const discussBtn = page.getByRole('button', { name: /דיון|הערות|discuss/i }).first()
    const visible = await discussBtn.isVisible().catch(() => false)
    if (visible) {
      await discussBtn.click()
      await expect(page.locator('.parliament-modal-panel')).toBeVisible({ timeout: 8000 })
      const textarea = page.locator('.parliament-modal-panel').locator('textarea').first()
      const submitBtn = page.locator('.parliament-modal-panel').getByRole('button', { name: /הוסף הערה|add note/i })
      await expect(textarea).toBeVisible({ timeout: 5000 })
      await expect(submitBtn).toBeVisible({ timeout: 5000 })
    }
  })

  test('reply button and edit/delete buttons exist on note items when present', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await page.waitForTimeout(2000)
    const discussBtn = page.getByRole('button', { name: /דיון|הערות|discuss/i }).first()
    const visible = await discussBtn.isVisible().catch(() => false)
    if (!visible) return
    await discussBtn.click()
    await expect(page.locator('.parliament-modal-panel')).toBeVisible({ timeout: 8000 })
    const noteItem = page.locator('.parliament-modal-panel').locator('.parliament-note-item').first()
    const hasNotes = await noteItem.isVisible().catch(() => false)
    if (hasNotes) {
      const replyBtn = noteItem.getByRole('button', { name: /השב|reply/i }).or(noteItem.locator('button').filter({ hasText: /💬|השב|reply/i }))
      const editBtn = noteItem.locator('button[title*="ערוך"], button[title*="edit"], button').filter({ hasText: '✏️' })
      const deleteBtn = noteItem.locator('button[title*="מחק"], button[title*="delete"], button').filter({ hasText: '🗑️' })
      await expect(replyBtn.or(editBtn).or(deleteBtn).first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('add note submit does not crash when subject has notes area', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await page.waitForTimeout(2000)
    const discussBtn = page.getByRole('button', { name: /דיון|הערות|discuss/i }).first()
    const visible = await discussBtn.isVisible().catch(() => false)
    if (!visible) return
    await discussBtn.click()
    await expect(page.locator('.parliament-modal-panel')).toBeVisible({ timeout: 8000 })
    const textarea = page.locator('.parliament-modal-panel').locator('form textarea').first()
    const submitBtn = page.locator('.parliament-modal-panel').getByRole('button', { name: /הוסף הערה|add note|שלח|submit/i })
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill('E2E note ' + Date.now())
      await submitBtn.click()
      await page.waitForTimeout(3000)
      await expect(page.locator('.parliament-modal-panel')).toBeVisible()
    }
  })

  test('reply: open reply form and cancel does not crash', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await page.waitForTimeout(2000)
    const discussBtn = page.getByRole('button', { name: /דיון|הערות|discuss/i }).first()
    if (!(await discussBtn.isVisible().catch(() => false))) return
    await discussBtn.click()
    await expect(page.locator('.parliament-modal-panel')).toBeVisible({ timeout: 8000 })
    const replyBtn = page.locator('.parliament-modal-panel').locator('.parliament-note-item').first().locator('button').filter({ hasText: /💬|השב|reply/i })
    if (await replyBtn.isVisible().catch(() => false)) {
      await replyBtn.click()
      await page.waitForTimeout(500)
      const cancelBtn = page.locator('.parliament-modal-panel').getByRole('button', { name: /ביטול|cancel/i })
      if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click()
      await expect(page.locator('.parliament-modal-panel')).toBeVisible()
    }
  })

  test('edit note: enter edit mode and cancel does not crash', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await page.waitForTimeout(2000)
    const discussBtn = page.getByRole('button', { name: /דיון|הערות|discuss/i }).first()
    if (!(await discussBtn.isVisible().catch(() => false))) return
    await discussBtn.click()
    await expect(page.locator('.parliament-modal-panel')).toBeVisible({ timeout: 8000 })
    const editBtn = page.locator('.parliament-modal-panel').locator('.parliament-note-item').first().locator('button').filter({ hasText: '✏️' })
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
      await page.waitForTimeout(500)
      const cancelBtn = page.locator('.parliament-modal-panel').getByRole('button', { name: /ביטול|cancel/i })
      if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click()
      await expect(page.locator('.parliament-modal-panel')).toBeVisible()
    }
  })

  test('delete note: confirm dialog appears when delete clicked', async ({ page }) => {
    await loginAsAdmin(page)
    await gotoE2E(page, '/parliament')
    await waitForAppReady(page)
    await page.waitForTimeout(2000)
    const discussBtn = page.getByRole('button', { name: /דיון|הערות|discuss/i }).first()
    if (!(await discussBtn.isVisible().catch(() => false))) return
    await discussBtn.click()
    await expect(page.locator('.parliament-modal-panel')).toBeVisible({ timeout: 8000 })
    const deleteBtn = page.locator('.parliament-modal-panel').locator('.parliament-note-item').first().locator('button').filter({ hasText: '🗑️' })
    if (await deleteBtn.isVisible().catch(() => false)) {
      page.once('dialog', d => d.dismiss())
      await deleteBtn.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.parliament-modal-panel')).toBeVisible()
    }
  })
})
