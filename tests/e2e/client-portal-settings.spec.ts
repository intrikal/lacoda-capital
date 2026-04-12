import { test, expect, type Page } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same pattern as other client portal specs
//
// The client portal lives at /client/* and is protected by Supabase middleware.
// Set TEST_CLIENT_EMAIL + TEST_CLIENT_PASSWORD in .env.local to run these
// against a real client account. Tests skip gracefully if not authenticated.
// ─────────────────────────────────────────────────────────────────────────────

async function loginAsClient(page: Page) {
  const email    = process.env.TEST_CLIENT_EMAIL    ?? process.env.TEST_USER_EMAIL
  const password = process.env.TEST_CLIENT_PASSWORD ?? process.env.TEST_USER_PASSWORD

  if (!email || !password) return false

  await page.goto("/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/(app|client|onboarding)/, { timeout: 10_000 })
  return true
}

test.describe("Client portal — Settings (/client/settings)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/settings")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client/settings")
    }

    await expect(
      page.getByRole("heading", { name: /^settings$/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── Page smoke test ──────────────────────────────────────────────────────────

  test("page loads at /client/settings with correct heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/settings/)
    await expect(page.getByRole("heading", { name: /^settings$/i })).toBeVisible()
  })

  test("subtitle describes the settings page purpose", async ({ page }) => {
    await expect(
      page.getByText(/manage your account preferences and security/i)
    ).toBeVisible()
  })

  // ── Tab navigation ───────────────────────────────────────────────────────────

  test("all five tabs are visible: Profile, Trusted Contacts, Notifications, Security, Preferences", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /profile/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /trusted contacts/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /notifications/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /security/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /preferences/i })).toBeVisible()
  })

  test("Profile tab is active by default", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /profile/i })).toHaveAttribute("data-state", "active")
  })

  // ── Profile tab ──────────────────────────────────────────────────────────────

  test("Profile tab shows Personal Information card", async ({ page }) => {
    await expect(page.getByText("Personal Information")).toBeVisible()
  })

  test("Profile tab has First Name and Last Name fields", async ({ page }) => {
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/last name/i)).toBeVisible()
  })

  test("Profile tab has Email Address and Phone Number fields", async ({ page }) => {
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/phone number/i)).toBeVisible()
  })

  test("Profile tab has a Save Changes button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible()
  })

  test("Profile tab shows Linked Accounts section", async ({ page }) => {
    await expect(page.getByText("Linked Accounts")).toBeVisible()
  })

  test("Profile tab shows linked bank account entries", async ({ page }) => {
    await expect(page.getByText(/Chase Bank|Bank of America/i).first()).toBeVisible()
  })

  // ── Notifications tab ────────────────────────────────────────────────────────

  test("clicking Notifications tab shows email notification settings", async ({ page }) => {
    await page.getByRole("tab", { name: /notifications/i }).click()
    await expect(page.getByText("Email Notifications")).toBeVisible({ timeout: 3_000 })
  })

  test("Notifications tab shows Account Updates toggle", async ({ page }) => {
    await page.getByRole("tab", { name: /notifications/i }).click()
    await expect(page.getByText(/account updates/i)).toBeVisible({ timeout: 3_000 })
  })

  test("Notifications tab shows Weekly Reports toggle", async ({ page }) => {
    await page.getByRole("tab", { name: /notifications/i }).click()
    await expect(page.getByText(/weekly reports/i)).toBeVisible({ timeout: 3_000 })
  })

  test("Notifications tab shows Push Notifications section", async ({ page }) => {
    await page.getByRole("tab", { name: /notifications/i }).click()
    await expect(page.getByText("Push Notifications")).toBeVisible({ timeout: 3_000 })
  })

  test("Notifications tab shows Transaction Alerts toggle", async ({ page }) => {
    await page.getByRole("tab", { name: /notifications/i }).click()
    await expect(page.getByText(/transaction alerts/i)).toBeVisible({ timeout: 3_000 })
  })

  test("Notifications tab shows Meeting Reminders toggle", async ({ page }) => {
    await page.getByRole("tab", { name: /notifications/i }).click()
    await expect(page.getByText(/meeting reminders/i)).toBeVisible({ timeout: 3_000 })
  })

  test("notification toggles (switches) are rendered on Notifications tab", async ({ page }) => {
    await page.getByRole("tab", { name: /notifications/i }).click()
    const switches = page.getByRole("switch")
    const count = await switches.count()
    expect(count).toBeGreaterThan(0)
  })

  // ── Security tab ─────────────────────────────────────────────────────────────

  test("clicking Security tab shows Password section", async ({ page }) => {
    await page.getByRole("tab", { name: /security/i }).click()
    await expect(page.getByText("Password")).toBeVisible({ timeout: 3_000 })
  })

  test("Security tab shows Current Password, New Password, and Confirm fields", async ({ page }) => {
    await page.getByRole("tab", { name: /security/i }).click()
    await expect(page.getByLabel(/current password/i)).toBeVisible({ timeout: 3_000 })
    await expect(page.getByLabel(/new password/i)).toBeVisible()
    await expect(page.getByLabel(/confirm new password/i)).toBeVisible()
  })

  test("Security tab has Update Password button", async ({ page }) => {
    await page.getByRole("tab", { name: /security/i }).click()
    await expect(
      page.getByRole("button", { name: /update password/i })
    ).toBeVisible({ timeout: 3_000 })
  })

  test("Security tab shows Two-Factor Authentication section", async ({ page }) => {
    await page.getByRole("tab", { name: /security/i }).click()
    await expect(page.getByText(/two-factor authentication/i)).toBeVisible({ timeout: 3_000 })
  })

  test("Security tab shows 2FA toggle switch", async ({ page }) => {
    await page.getByRole("tab", { name: /security/i }).click()
    // Require a code in addition to your password
    await expect(
      page.getByText(/require a code in addition to your password/i)
    ).toBeVisible({ timeout: 3_000 })
  })

  test("Security tab shows Biometric Login toggle", async ({ page }) => {
    await page.getByRole("tab", { name: /security/i }).click()
    await expect(page.getByText(/biometric login/i)).toBeVisible({ timeout: 3_000 })
  })

  test("Security tab shows Active Sessions section", async ({ page }) => {
    await page.getByRole("tab", { name: /security/i }).click()
    await expect(page.getByText("Active Sessions")).toBeVisible({ timeout: 3_000 })
  })

  test("Active Sessions shows current session with Active label", async ({ page }) => {
    await page.getByRole("tab", { name: /security/i }).click()
    await expect(page.getByText("Active")).toBeVisible({ timeout: 3_000 })
  })

  // ── Trusted Contacts tab ─────────────────────────────────────────────────────

  test("clicking Trusted Contacts tab shows the contacts section", async ({ page }) => {
    await page.getByRole("tab", { name: /trusted contacts/i }).click()
    await expect(page.getByText("Trusted Contacts").first()).toBeVisible({ timeout: 3_000 })
  })

  test("Trusted Contacts tab has Add Contact button", async ({ page }) => {
    await page.getByRole("tab", { name: /trusted contacts/i }).click()
    await expect(
      page.getByRole("button", { name: /add contact/i })
    ).toBeVisible({ timeout: 3_000 })
  })

  // ── Preferences tab ──────────────────────────────────────────────────────────

  test("clicking Preferences tab shows Display Preferences", async ({ page }) => {
    await page.getByRole("tab", { name: /preferences/i }).click()
    await expect(page.getByText("Display Preferences")).toBeVisible({ timeout: 3_000 })
  })

  test("Preferences tab shows Currency Display setting", async ({ page }) => {
    await page.getByRole("tab", { name: /preferences/i }).click()
    await expect(page.getByText(/currency display/i)).toBeVisible({ timeout: 3_000 })
  })

  test("Preferences tab shows Privacy Settings section", async ({ page }) => {
    await page.getByRole("tab", { name: /preferences/i }).click()
    await expect(page.getByText("Privacy Settings")).toBeVisible({ timeout: 3_000 })
  })

  test("Preferences tab shows Hide Portfolio Balances option", async ({ page }) => {
    await page.getByRole("tab", { name: /preferences/i }).click()
    await expect(page.getByText(/hide portfolio balances/i)).toBeVisible({ timeout: 3_000 })
  })

  // ── Sidebar navigation ────────────────────────────────────────────────────────

  test("sidebar is visible on the settings page", async ({ page }) => {
    await expect(page.locator("aside")).toBeVisible()
  })
})
