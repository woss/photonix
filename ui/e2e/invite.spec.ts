import { test, expect, type Page } from '@playwright/test'
import {
  runDjangoCommand,
  setupTestUser,
  cleanupTestUser,
  login,
} from './test-utils'

const OWNER = { username: 'inviteowner', password: 'testpassword123' }
const MEMBER = { username: 'invitemember', password: 'testpassword123' }
const SIGNUP_USERNAME = 'invitedfriend'

function cleanupAll() {
  // The invited signup user is a non-owner member: remove the user row only
  // (their membership cascades); cleanupTestUser would delete shared libraries.
  runDjangoCommand(`
from photonix.accounts.models import User
User.objects.filter(username='${SIGNUP_USERNAME}').delete()
`)
  cleanupTestUser(MEMBER.username)
  cleanupTestUser(OWNER.username)
}

test.describe.serial('Library invitations and members', () => {
  test.beforeAll(async () => {
    cleanupAll()
    setupTestUser(OWNER.username, OWNER.password)
    setupTestUser(MEMBER.username, MEMBER.password)
  })

  test.afterAll(async () => {
    cleanupAll()
  })

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  // In-app navigation (not page.goto) to avoid the JWT-refresh-on-reload
  // login bounce under load.
  async function openOwnLibrary(page: Page) {
    await page.getByTestId('header-menu-button').click()
    await page.getByTestId('settings-menu-item').click()
    await expect(page).toHaveURL('/settings/account', { timeout: 10000 })
    await page.getByTestId('settings-nav-libraries').click()
    await page.locator('[data-testid^="library-settings-link-"]').first().click()
    await expect(page.getByTestId('library-members-card')).toBeVisible({
      timeout: 10000,
    })
  }

  test('owner adds an existing user by exact username, then removes them', async ({
    page,
  }) => {
    await login(page, OWNER.username, OWNER.password)
    await openOwnLibrary(page)

    await page.getByTestId('add-member-input').fill(MEMBER.username)
    await page.getByTestId('add-member-button').click()
    await expect(page.getByTestId(`member-row-${MEMBER.username}`)).toBeVisible({
      timeout: 10000,
    })

    // Unknown usernames get a vague error, not a membership
    await page.getByTestId('add-member-input').fill('no-such-user-xyz')
    await page.getByTestId('add-member-button').click()
    await expect(page.getByTestId('toast-error')).toBeVisible({ timeout: 10000 })

    // Remove the member again (accept the confirm dialog)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByTestId(`member-remove-${MEMBER.username}`).click()
    await expect(page.getByTestId(`member-row-${MEMBER.username}`)).toHaveCount(
      0,
      { timeout: 10000 }
    )
  })

  test('last owner cannot leave their library', async ({ page }) => {
    await login(page, OWNER.username, OWNER.password)
    await openOwnLibrary(page)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByTestId(`member-remove-${OWNER.username}`).click()
    await expect(page.getByTestId('toast-error')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId(`member-row-${OWNER.username}`)).toBeVisible()
  })

  test('new user signs up through an invite link and joins the library', async ({
    page,
    browser,
  }) => {
    await login(page, OWNER.username, OWNER.password)
    await openOwnLibrary(page)

    await page.getByTestId('create-invite-button').click()
    await expect(page.getByTestId('invite-link-box')).toBeVisible({
      timeout: 10000,
    })
    const inviteUrl = (
      await page.getByTestId('invite-link-url').textContent()
    )?.trim()
    expect(inviteUrl).toBeTruthy()
    await expect(page.getByTestId('pending-invites-list')).toBeVisible()

    // A logged-out visitor opens the link and creates an account
    const visitorContext = await browser.newContext()
    const visitor = await visitorContext.newPage()
    await visitor.goto(inviteUrl!)
    await expect(visitor.getByTestId('invite-valid')).toBeVisible({
      timeout: 15000,
    })
    await expect(visitor.getByTestId('invite-inviter')).toHaveText(
      OWNER.username
    )

    await visitor.getByTestId('invite-signup-button').click()
    await visitor.getByTestId('invite-username-input').fill(SIGNUP_USERNAME)
    await visitor.getByTestId('invite-password-input').fill('longenoughpw1')
    await visitor
      .getByTestId('invite-password-confirm-input')
      .fill('longenoughpw1')
    await visitor.getByTestId('invite-signup-submit').click()

    // Lands in the app, member of the owner's library
    await expect(visitor).toHaveURL('/', { timeout: 15000 })
    await visitor.getByTestId('header-menu-button').click()
    await expect(visitor.getByTestId('logged-in-user')).toHaveText(
      SIGNUP_USERNAME,
      { timeout: 10000 }
    )
    await visitorContext.close()

    const membership = runDjangoCommand(`
from photonix.photos.models import LibraryUser, LibraryInvitation
membership = LibraryUser.objects.filter(user__username='${SIGNUP_USERNAME}').first()
invitation = LibraryInvitation.objects.filter(accepted_by__username='${SIGNUP_USERNAME}').first()
print(f'{membership.owner if membership else None},{bool(invitation)}')
`)
    expect(membership.trim()).toBe('False,True')

    // The invite is spent: the same link is now a dead link
    const secondContext = await browser.newContext()
    const second = await secondContext.newPage()
    await second.goto(inviteUrl!)
    await expect(second.getByTestId('invite-invalid')).toBeVisible({
      timeout: 15000,
    })
    await secondContext.close()
  })

  test('revoked invitations stop working', async ({ page, browser }) => {
    await login(page, OWNER.username, OWNER.password)
    await openOwnLibrary(page)

    await page.getByTestId('create-invite-button').click()
    await expect(page.getByTestId('invite-link-box')).toBeVisible({
      timeout: 10000,
    })
    const inviteUrl = (
      await page.getByTestId('invite-link-url').textContent()
    )?.trim()

    await page
      .locator('[data-testid^="revoke-invite-"]')
      .first()
      .click()
    await expect(page.locator('[data-testid^="revoke-invite-"]')).toHaveCount(
      0,
      { timeout: 10000 }
    )

    const visitorContext = await browser.newContext()
    const visitor = await visitorContext.newPage()
    await visitor.goto(inviteUrl!)
    await expect(visitor.getByTestId('invite-invalid')).toBeVisible({
      timeout: 15000,
    })
    await visitorContext.close()
  })

  test('bogus invite tokens show the dead-link page', async ({ page }) => {
    await page.goto('/invite/11111111-1111-4111-8111-111111111111')
    await expect(page.getByTestId('invite-invalid')).toBeVisible({
      timeout: 15000,
    })
  })
})
