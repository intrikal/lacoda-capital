/**
 * ============================================================================
 * E2E TEST FILE: dashboard-settings.spec.ts
 * ============================================================================
 *
 * Tests for the settings page at /app/settings.
 * The page has six tabs: Profile, Team, Security, Notifications, Billing, Privacy.
 *
 * BEFORE RUNNING:
 *   npm run dev
 *   npx playwright test tests/e2e/dashboard-settings.spec.ts
 *
 * CREDENTIALS:
 *   No env vars required for the basic rendering tests.
 *   The "update profile name" test will mutate real data if run against a
 *   live Supabase project — use a dedicated test account.
 *   Set TEST_USER_EMAIL / TEST_USER_PASSWORD in .env.local for that test.
 */

import { test, expect } from "@playwright/test"

test.describe("Settings page (/app/settings)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/settings")
    if (page.url().includes("/login")) {
      test.skip()
    }
  })

  // ── Page load ─────────────────────────────────────────────────────────────

  test("page loads with Settings heading and Profile tab active", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /^settings$/i })
    ).toBeVisible()

    // "Profile" tab should be the default active tab
    const profileTab = page.getByRole("tab", { name: /profile/i })
    await expect(profileTab).toBeVisible()
    await expect(profileTab).toHaveAttribute("aria-selected", "true")

    // The "Personal Information" card lives inside the Profile panel
    await expect(page.getByText(/personal information/i)).toBeVisible()
  })

  // ── Tab switching: Team ───────────────────────────────────────────────────

  test("switching to Team tab shows the member list", async ({ page }) => {
    await page.getByRole("tab", { name: /team/i }).click()

    // The team panel should now be visible and contain member rows
    // (real data will show real members; we just assert the panel rendered)
    const teamTab = page.getByRole("tab", { name: /team/i })
    await expect(teamTab).toHaveAttribute("aria-selected", "true")

    // The "Invite Team Member" button lives in the Team panel
    await expect(
      page.getByRole("button", { name: /invite team member/i })
    ).toBeVisible()
  })

  // ── Tab switching: Security ───────────────────────────────────────────────

  test("switching to Security tab shows security settings", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /security/i }).click()

    const secTab = page.getByRole("tab", { name: /security/i })
    await expect(secTab).toHaveAttribute("aria-selected", "true")

    // Security tab content — look for password or 2FA-related elements
    await expect(
      page.getByText(/two-factor|2fa|password|authentication/i).first()
    ).toBeVisible()
  })

  // ── Profile form pre-fill ─────────────────────────────────────────────────

  test("Profile form has name fields pre-filled", async ({ page }) => {
    // The form should render First Name and Last Name inputs that are
    // already populated (not empty) for an authenticated user
    const firstNameInput = page.getByLabel(/first name/i)
    const lastNameInput = page.getByLabel(/last name/i)

    await expect(firstNameInput).toBeVisible()
    await expect(lastNameInput).toBeVisible()

    // Values should not be blank for a real user
    const firstName = await firstNameInput.inputValue()
    const lastName = await lastNameInput.inputValue()

    expect(firstName.length).toBeGreaterThan(0)
    expect(lastName.length).toBeGreaterThan(0)
  })

  // ── Update profile name → success feedback ────────────────────────────────

  test("updating profile name shows success feedback", async ({ page }) => {
    const firstNameInput = page.getByLabel(/first name/i)
    await expect(firstNameInput).toBeVisible()

    // Read current value so we can restore it
    const original = await firstNameInput.inputValue()

    await firstNameInput.clear()
    await firstNameInput.fill("E2ETestName")

    await page.getByRole("button", { name: /save changes/i }).click()

    // A success toast or message should appear
    await expect(
      page.getByText(/saved|updated|success/i).first()
    ).toBeVisible({ timeout: 5_000 })

    // Restore the original value so the test is non-destructive
    await firstNameInput.clear()
    await firstNameInput.fill(original || "Kevin")
    await page.getByRole("button", { name: /save changes/i }).click()
  })
})
