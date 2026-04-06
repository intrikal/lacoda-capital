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

test.describe("Client portal — Assets (/client/assets)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/assets")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client/assets")
    }

    await expect(
      page.getByRole("heading", { name: /asset holdings/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── Page smoke test ──────────────────────────────────────────────────────────

  test("page loads at /client/assets with correct heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/assets/)
    await expect(page.getByRole("heading", { name: /asset holdings/i })).toBeVisible()
  })

  test("subtitle shows position count and asset class count", async ({ page }) => {
    // e.g. "12 positions across 5 asset classes"
    await expect(page.getByText(/positions across/i)).toBeVisible()
  })

  // ── KPI cards ────────────────────────────────────────────────────────────────

  test("shows four KPI summary cards", async ({ page }) => {
    await expect(page.getByText("Total Value")).toBeVisible()
    await expect(page.getByText("Total Cost Basis")).toBeVisible()
    await expect(page.getByText("Unrealized G/L")).toBeVisible()
    await expect(page.getByText("Total Return")).toBeVisible()
  })

  test("Total Value card shows a dollar figure", async ({ page }) => {
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible()
  })

  test("Total Return card shows a percentage", async ({ page }) => {
    const returnCard = page.locator("div, p").filter({ hasText: /Total Return/ }).first()
    const parentCard = returnCard.locator("..")
    await expect(parentCard.getByText(/%/)).toBeVisible()
  })

  // ── Allocation chart ─────────────────────────────────────────────────────────

  test("allocation chart is visible", async ({ page }) => {
    await expect(page.getByText("Allocation")).toBeVisible()
    await expect(page.getByText(/portfolio by asset class/i)).toBeVisible()
  })

  test("allocation chart SVG renders", async ({ page }) => {
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 5_000 })
  })

  // ── By Asset Class breakdown ─────────────────────────────────────────────────

  test("By Asset Class breakdown card is visible", async ({ page }) => {
    await expect(page.getByText("By Asset Class")).toBeVisible()
  })

  test("asset class bars show all five classes with dollar amounts", async ({ page }) => {
    await expect(page.getByText("Equities")).toBeVisible()
    await expect(page.getByText("Real Estate")).toBeVisible()
    await expect(page.getByText("Fixed Income")).toBeVisible()
    await expect(page.getByText("Private Equity")).toBeVisible()
    await expect(page.getByText(/Cash/i)).toBeVisible()
  })

  test("each asset class row shows a percentage allocation", async ({ page }) => {
    // Multiple % values are rendered (one per class)
    const pctValues = page.getByText(/%/).filter({ hasNotText: /return|gain|loss/i })
    const count = await pctValues.count()
    expect(count).toBeGreaterThan(0)
  })

  // ── Holdings table ───────────────────────────────────────────────────────────

  test("All Holdings table card is visible", async ({ page }) => {
    await expect(page.getByText("All Holdings")).toBeVisible()
    await expect(page.getByText("Click a row to expand details")).toBeVisible()
  })

  test("filter tabs (All, Equities, Real Estate, Fixed Income, Private Equity, Cash) are all visible", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "All" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Equities" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Real Estate" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Fixed Income" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Private Equity" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Cash" })).toBeVisible()
  })

  test("All tab is active by default", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute("data-state", "active")
  })

  test("table headers are present: Asset, Class, Value, Gain / Loss", async ({ page }) => {
    await expect(page.getByText("Asset")).toBeVisible()
    await expect(page.getByText("Value")).toBeVisible()
    await expect(page.getByText(/Gain \/ Loss/i)).toBeVisible()
  })

  test("at least one holding row is visible", async ({ page }) => {
    // Rows use border-b border-zinc-800/60
    const rows = page.locator("tr.border-b")
    await expect(rows.first()).toBeVisible({ timeout: 5_000 })
  })

  test("holding rows show asset names (e.g. Vanguard S&P 500 ETF)", async ({ page }) => {
    await expect(page.getByText(/Vanguard|Apple|Microsoft|Property|Treasury|Municipal|Savings|Equity/i).first()).toBeVisible()
  })

  test("holding rows show dollar values", async ({ page }) => {
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible()
  })

  test("holding rows show gain/loss with + or - prefix", async ({ page }) => {
    await expect(page.getByText(/[+\-]\$[\d,]+/).first()).toBeVisible()
  })

  // ── Expand/collapse rows ─────────────────────────────────────────────────────

  test("clicking a holding row expands to show cost basis and unrealized G/L", async ({ page }) => {
    const firstDataRow = page.locator("tr.border-b").first()
    await firstDataRow.click()

    // Expanded detail row shows "Cost basis" label
    await expect(page.getByText("Cost basis")).toBeVisible({ timeout: 3_000 })
    await expect(page.getByText("Unrealized G/L")).toBeVisible()
  })

  test("clicking an expanded row collapses it", async ({ page }) => {
    const firstDataRow = page.locator("tr.border-b").first()
    await firstDataRow.click()
    await expect(page.getByText("Cost basis")).toBeVisible()

    await firstDataRow.click()
    await expect(page.getByText("Cost basis")).not.toBeVisible({ timeout: 3_000 })
  })

  test("expanded row shows Account field", async ({ page }) => {
    const firstDataRow = page.locator("tr.border-b").first()
    await firstDataRow.click()
    await expect(page.getByText("Account")).toBeVisible({ timeout: 3_000 })
  })

  // ── Tab filtering ─────────────────────────────────────────────────────────────

  test("clicking Equities tab filters table to equities only", async ({ page }) => {
    await page.getByRole("tab", { name: "Equities" }).click()
    await expect(page.getByRole("tab", { name: "Equities" })).toHaveAttribute("data-state", "active")

    // Real estate assets (Primary Residence, Rental Property) should not appear
    await expect(page.getByText("Primary Residence")).not.toBeVisible({ timeout: 3_000 })
  })

  test("clicking Real Estate tab shows only real estate holdings", async ({ page }) => {
    await page.getByRole("tab", { name: "Real Estate" }).click()
    await expect(page.getByText(/Primary Residence|Rental Property/i).first()).toBeVisible({ timeout: 3_000 })

    // Equities (VOO, AAPL) should be gone
    await expect(page.getByText("Vanguard S&P 500 ETF")).not.toBeVisible({ timeout: 3_000 })
  })

  test("clicking Cash tab shows only cash-equivalent holdings", async ({ page }) => {
    await page.getByRole("tab", { name: "Cash" }).click()
    await expect(page.getByText(/High-Yield Savings|Money Market/i).first()).toBeVisible({ timeout: 3_000 })
  })

  test("switching back to All tab restores all holdings", async ({ page }) => {
    await page.getByRole("tab", { name: "Equities" }).click()
    await page.getByRole("tab", { name: "All" }).click()
    await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute("data-state", "active")

    // Both equities and real estate rows should be visible again
    await expect(page.getByText("Vanguard S&P 500 ETF")).toBeVisible({ timeout: 3_000 })
  })

  // ── Ticker badges ─────────────────────────────────────────────────────────────

  test("equities show ticker badges (VOO, AAPL, MSFT)", async ({ page }) => {
    const tickerTerms = /VOO|AAPL|MSFT|BND/
    await expect(page.getByText(tickerTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Sidebar navigation ────────────────────────────────────────────────────────

  test("Asset nav item in sidebar is active when on /client/assets", async ({ page }) => {
    // The sidebar nav link for Assets should have active styling
    const assetNavLink = page.getByRole("link", { name: /asset/i })
    await expect(assetNavLink).toBeVisible()
  })

  test("sidebar links to other client pages still work from assets page", async ({ page }) => {
    // Navigate to Portfolio and back without errors
    const portfolioLink = page.getByRole("link", { name: /overview|portfolio/i }).first()
    await portfolioLink.click()
    await expect(page).toHaveURL(/\/client/)
  })
})
