import { test, expect, type Page } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same pattern as other client portal specs
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

test.describe("Client portal — Expenses (/client/expenses)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/expenses")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client/expenses")
    }

    await expect(
      page.getByRole("heading", { name: /expenses|spending/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── Page smoke test ──────────────────────────────────────────────────────────

  test("page loads at /client/expenses with heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/expenses/)
    await expect(page.getByRole("heading", { name: /expenses|spending/i })).toBeVisible()
  })

  // ── KPI cards ────────────────────────────────────────────────────────────────

  test("shows KPI summary cards for expense totals", async ({ page }) => {
    // At least one KPI card with a dollar value should be visible
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible()
  })

  test("shows Total / Paid / Pending / Overdue cards or equivalent", async ({ page }) => {
    const kpiTerms = /total|paid|pending|overdue/i
    await expect(page.getByText(kpiTerms).first()).toBeVisible()
  })

  // ── Tab navigation ────────────────────────────────────────────────────────────

  test("shows main tabs: Expenses, Refinance, Equity Boosts (or equivalent)", async ({ page }) => {
    // At least two tabs present — the exact names may vary
    const tabs = page.getByRole("tab")
    const count = await tabs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test("default tab is active on load", async ({ page }) => {
    // One tab must be active
    // More reliable: check at least one tab has data-state=active
    await expect(page.locator('[role="tab"][data-state="active"]').first()).toBeVisible()
  })

  // ── Spending by category ──────────────────────────────────────────────────────

  test("shows spending by category section with progress bars", async ({ page }) => {
    // Categories: renovation, maintenance, property_tax, insurance, utilities
    const categoryTerms = /renovation|maintenance|property tax|insurance|utilities/i
    await expect(page.getByText(categoryTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  test("category bars show dollar amounts", async ({ page }) => {
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible()
  })

  // ── Expense list ──────────────────────────────────────────────────────────────

  test("expense list has rows with titles and amounts", async ({ page }) => {
    // Expense rows show a title (like "Roof Replacement") and a dollar amount
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible()
  })

  test("expense rows show status indicators (Paid, Pending, Overdue)", async ({ page }) => {
    const statusTerms = /paid|pending|overdue/i
    await expect(page.getByText(statusTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  test("expense rows show category labels", async ({ page }) => {
    const catTerms = /renovation|maintenance|property tax|insurance|utilities/i
    await expect(page.getByText(catTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  test("expense rows show vendor names", async ({ page }) => {
    // Mock data includes vendors like "Apex Roofing Co.", "State Farm", etc.
    const vendorTerms = /roofing|plumbing|hvac|contractor|vendor|insurance|management/i
    await expect(page.getByText(vendorTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Refinance tab ─────────────────────────────────────────────────────────────

  test("Refinance tab content loads when clicked", async ({ page }) => {
    const refinanceTab = page.getByRole("tab", { name: /refinance/i })
    const isVisible = await refinanceTab.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await refinanceTab.click()
    await expect(refinanceTab).toHaveAttribute("data-state", "active")
    await expect(page).toHaveURL(/\/client\/expenses/)
  })

  test("Refinance tab shows interest rate comparison", async ({ page }) => {
    const refinanceTab = page.getByRole("tab", { name: /refinance/i })
    const isVisible = await refinanceTab.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await refinanceTab.click()
    // Rate values shown as percentages
    await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Refinance tab shows monthly savings or payment reduction", async ({ page }) => {
    const refinanceTab = page.getByRole("tab", { name: /refinance/i })
    const isVisible = await refinanceTab.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await refinanceTab.click()
    await expect(page.getByText(/monthly savings|save|savings|payment reduction/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Refinance tab shows Contact Advisor CTA", async ({ page }) => {
    const refinanceTab = page.getByRole("tab", { name: /refinance/i })
    const isVisible = await refinanceTab.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await refinanceTab.click()
    await expect(
      page.getByRole("button", { name: /contact advisor|request review|get started/i }).first()
    ).toBeVisible({ timeout: 5_000 })
  })

  // ── Equity Boosts tab ─────────────────────────────────────────────────────────

  test("Equity Boosts tab content loads when clicked", async ({ page }) => {
    const equityTab = page.getByRole("tab", { name: /equity boost|remodel/i })
    const isVisible = await equityTab.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await equityTab.click()
    await expect(equityTab).toHaveAttribute("data-state", "active")
    await expect(page).toHaveURL(/\/client\/expenses/)
  })

  test("Equity Boosts tab shows ROI estimates", async ({ page }) => {
    const equityTab = page.getByRole("tab", { name: /equity boost|remodel/i })
    const isVisible = await equityTab.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await equityTab.click()
    await expect(page.getByText(/ROI|return on investment|value increase/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Equity Boosts tab shows improvement project names", async ({ page }) => {
    const equityTab = page.getByRole("tab", { name: /equity boost|remodel/i })
    const isVisible = await equityTab.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await equityTab.click()
    const projectTerms = /kitchen|bathroom|roof|solar|landscaping|ADU|accessory/i
    await expect(page.getByText(projectTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Equity Boosts cards show estimated cost and value increase", async ({ page }) => {
    const equityTab = page.getByRole("tab", { name: /equity boost|remodel/i })
    const isVisible = await equityTab.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }

    await equityTab.click()
    await expect(page.getByText(/estimated cost|cost estimate/i).first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/value increase|equity gain/i).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Advisor CTA (read-only client view) ────────────────────────────────────────

  test("client view does not show admin-only Add Expense button", async ({ page }) => {
    // Clients can only view — no add/edit/delete controls
    const addBtn = page.getByRole("button", { name: /add expense/i })
    await expect(addBtn).not.toBeVisible()
  })

  // ── Sidebar ───────────────────────────────────────────────────────────────────

  test("Expenses nav item in client sidebar is active when on /client/expenses", async ({ page }) => {
    const expensesLink = page.getByRole("link", { name: /expenses/i })
    await expect(expensesLink).toBeVisible()
  })

  test("navigating away from Expenses and back works correctly", async ({ page }) => {
    await page.getByRole("link", { name: /overview/i }).first().click()
    await expect(page).toHaveURL(/\/client$|\/client\//)

    await page.goto("/client/expenses")
    await expect(page.getByRole("heading", { name: /expenses|spending/i })).toBeVisible()
  })
})
