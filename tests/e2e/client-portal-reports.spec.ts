import { test, expect, type Page } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same pattern as other client portal specs
//
// The client portal lives at /client/* and is protected by Supabase middleware.
// Set TEST_CLIENT_EMAIL + TEST_CLIENT_PASSWORD in .env.local to run these
// against a real client account. Tests skip gracefully if not authenticated.
//
// DATA REQUIREMENT (report list tests):
//   At least one report with status = 'published' must exist for this org.
//   The page filters to published reports only. If none exist, the empty state
//   "No reports available yet." is rendered and the data-dependent tests skip.
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

test.describe("Client portal — Reports (/client/reports)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/reports")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client/reports")
    }

    await expect(
      page.getByRole("heading", { name: /my reports/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── Page smoke test ──────────────────────────────────────────────────────────

  test("page loads at /client/reports with correct heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/reports/)
    await expect(page.getByRole("heading", { name: /my reports/i })).toBeVisible()
  })

  test("subtitle describes the reports page purpose", async ({ page }) => {
    await expect(
      page.getByText(/view and download your portfolio reports/i)
    ).toBeVisible()
  })

  // ── Quick Download cards ─────────────────────────────────────────────────────

  test("Quick Download cards are visible for the four main report types", async ({ page }) => {
    await expect(page.getByText("Portfolio Summary")).toBeVisible()
    await expect(page.getByText("Asset Allocation")).toBeVisible()
    await expect(page.getByText("Performance")).toBeVisible()
    await expect(page.getByText("Tax Summary")).toBeVisible()
  })

  test("each Quick Download card shows 'Latest Report' label", async ({ page }) => {
    const latestLabels = page.getByText("Latest Report")
    const count = await latestLabels.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  // ── Recent Reports card ──────────────────────────────────────────────────────

  test("Recent Reports card is visible", async ({ page }) => {
    await expect(page.getByText("Recent Reports")).toBeVisible()
  })

  test("Recent Reports card shows loading state or report list or empty state", async ({ page }) => {
    // One of three states must be visible after load
    const hasReports    = await page.getByText(/Loading reports|No reports available yet/i).count()
    const hasReportRows = await page.locator('[class*="border-zinc-800"]').count()
    expect(hasReports + hasReportRows).toBeGreaterThan(0)
  })

  test("empty state shows icon and message when no published reports exist", async ({ page }) => {
    // Wait for loading to finish
    await page.waitForSelector('[class*="text-center text-zinc-500"], [class*="space-y-4"]', { timeout: 8_000 })

    const isEmpty = await page.getByText(/no reports available yet/i).isVisible()
    if (!isEmpty) {
      // Reports exist — skip the empty-state assertion
      test.skip()
      return
    }
    await expect(page.getByText(/no reports available yet/i)).toBeVisible()
  })

  // ── Report list (requires seeded published reports) ──────────────────────────

  test("report rows show a report title when published reports exist", async ({ page }) => {
    // DATA REQUIREMENT: at least one published report must be seeded.
    await page.waitForSelector('[class*="text-center text-zinc-500"], [class*="space-y-4"]', { timeout: 8_000 })

    const hasEmpty = await page.getByText(/no reports available yet/i).isVisible()
    if (hasEmpty) {
      test.skip()
      return
    }
    // Reports exist — a font-medium text-zinc-100 title should be present
    await expect(page.locator('p.font-medium').first()).toBeVisible()
  })

  test("report rows show report type label (e.g. Portfolio Summary, Performance)", async ({ page }) => {
    // DATA REQUIREMENT: at least one published report must be seeded.
    await page.waitForSelector('[class*="text-center text-zinc-500"], [class*="space-y-4"]', { timeout: 8_000 })

    const hasEmpty = await page.getByText(/no reports available yet/i).isVisible()
    if (hasEmpty) {
      test.skip()
      return
    }
    await expect(
      page.getByText(/Portfolio Summary|Asset Allocation|Performance|Tax Summary|Compliance|Client Statement|Custom/i).first()
    ).toBeVisible()
  })

  test("report rows show a created date", async ({ page }) => {
    // DATA REQUIREMENT: at least one published report must be seeded.
    await page.waitForSelector('[class*="text-center text-zinc-500"], [class*="space-y-4"]', { timeout: 8_000 })

    const hasEmpty = await page.getByText(/no reports available yet/i).isVisible()
    if (hasEmpty) {
      test.skip()
      return
    }
    // date-fns formats as "MMM d, yyyy" e.g. "Jan 5, 2025"
    await expect(page.getByText(/Created /i).first()).toBeVisible()
  })

  test("report rows show Published status badge when reports exist", async ({ page }) => {
    // DATA REQUIREMENT: at least one published report must be seeded.
    await page.waitForSelector('[class*="text-center text-zinc-500"], [class*="space-y-4"]', { timeout: 8_000 })

    const hasEmpty = await page.getByText(/no reports available yet/i).isVisible()
    if (hasEmpty) {
      test.skip()
      return
    }
    await expect(page.getByText("Published").first()).toBeVisible()
  })

  test("report rows show View and Download buttons when reports exist", async ({ page }) => {
    // DATA REQUIREMENT: at least one published report must be seeded.
    await page.waitForSelector('[class*="text-center text-zinc-500"], [class*="space-y-4"]', { timeout: 8_000 })

    const hasEmpty = await page.getByText(/no reports available yet/i).isVisible()
    if (hasEmpty) {
      test.skip()
      return
    }
    await expect(page.getByRole("button", { name: /view/i }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /download/i }).first()).toBeVisible()
  })

  // ── Request Report CTA ───────────────────────────────────────────────────────

  test('"Need a custom report?" section is visible', async ({ page }) => {
    await expect(page.getByText(/need a custom report/i)).toBeVisible()
    await expect(
      page.getByText(/contact your advisor to request a custom analysis/i)
    ).toBeVisible()
  })

  test('"Request Report" button is visible and clickable', async ({ page }) => {
    const btn = page.getByRole("button", { name: /request report/i })
    await expect(btn).toBeVisible()
    await expect(btn).toBeEnabled()
  })

  // ── Sidebar navigation ────────────────────────────────────────────────────────

  test("sidebar is visible on the reports page", async ({ page }) => {
    await expect(page.locator("aside")).toBeVisible()
  })
})
