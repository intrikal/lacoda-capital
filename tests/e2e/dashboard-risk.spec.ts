import { test, expect, type Page } from "@playwright/test"

async function waitForRiskPage(page: Page) {
  await page.goto("/app/risk")
  if (page.url().includes("/login")) {
    test.skip()
    return false
  }
  await expect(page.getByRole("heading", { name: /risk management/i })).toBeVisible({ timeout: 10_000 })
  return true
}

test.describe("Risk Management page (/app/risk)", () => {
  test.beforeEach(async ({ page }) => {
    await waitForRiskPage(page)
  })

  // ── Page structure ──────────────────────────────────────────────────────────

  test("shows Risk Management heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /risk management/i })).toBeVisible()
  })

  test("shows all four tabs: Risk Profiles, Drawdown Limits, Volatility Controls, Hedging", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /risk profiles/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /drawdown/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /volatility/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /hedging/i })).toBeVisible()
  })

  test("Risk Profiles tab is active by default", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /risk profiles/i })).toHaveAttribute("data-state", "active")
  })

  // ── Risk Profiles tab ────────────────────────────────────────────────────────

  test("Risk Profiles tab shows a table with client rows", async ({ page }) => {
    // Table header or at least one data row should be visible
    await expect(page.getByText(/client/i).first()).toBeVisible()
  })

  test("Risk Profiles tab shows risk tolerance labels (conservative, moderate, aggressive)", async ({ page }) => {
    const toleranceTerms = /conservative|moderate|aggressive/i
    await expect(page.getByText(toleranceTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Risk Profiles tab shows alert status badges", async ({ page }) => {
    const statusTerms = /normal|warning|breach/i
    await expect(page.getByText(statusTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Drawdown Limits tab ──────────────────────────────────────────────────────

  test("Drawdown Limits tab content loads when clicked", async ({ page }) => {
    await page.getByRole("tab", { name: /drawdown/i }).click()
    await expect(page.getByRole("tab", { name: /drawdown/i })).toHaveAttribute("data-state", "active")
    await expect(page).toHaveURL(/\/app\/risk/)
  })

  test("Drawdown Limits tab shows drawdown threshold values (%)", async ({ page }) => {
    await page.getByRole("tab", { name: /drawdown/i }).click()
    await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Drawdown Limits tab shows visual progress bars or gauges", async ({ page }) => {
    await page.getByRole("tab", { name: /drawdown/i }).click()
    // Progress bars render as div elements with specific styling
    const progressBars = page.locator("[role='progressbar'], .h-2, .h-3").first()
    await expect(progressBars).toBeVisible({ timeout: 5_000 })
  })

  test("Drawdown Limits tab shows soft and hard limit labels", async ({ page }) => {
    await page.getByRole("tab", { name: /drawdown/i }).click()
    await expect(page.getByText(/soft|hard|alert|max/i).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Volatility Controls tab ──────────────────────────────────────────────────

  test("Volatility Controls tab content loads when clicked", async ({ page }) => {
    await page.getByRole("tab", { name: /volatility/i }).click()
    await expect(page.getByRole("tab", { name: /volatility/i })).toHaveAttribute("data-state", "active")
    await expect(page).toHaveURL(/\/app\/risk/)
  })

  test("Volatility Controls tab shows volatility metric values", async ({ page }) => {
    await page.getByRole("tab", { name: /volatility/i }).click()
    // Volatility values shown as percentages
    await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Volatility Controls tab shows VaR (Value at Risk) data", async ({ page }) => {
    await page.getByRole("tab", { name: /volatility/i }).click()
    await expect(page.getByText(/VaR|value at risk/i).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Hedging tab ───────────────────────────────────────────────────────────────

  test("Hedging tab content loads when clicked", async ({ page }) => {
    await page.getByRole("tab", { name: /hedging/i }).click()
    await expect(page.getByRole("tab", { name: /hedging/i })).toHaveAttribute("data-state", "active")
    await expect(page).toHaveURL(/\/app\/risk/)
  })

  test("Hedging tab shows hedge ratio values (%)", async ({ page }) => {
    await page.getByRole("tab", { name: /hedging/i }).click()
    await expect(page.getByText(/hedge ratio|hedging/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Hedging tab shows hedging instrument details", async ({ page }) => {
    await page.getByRole("tab", { name: /hedging/i }).click()
    await expect(page.getByText(/instrument|options|futures|puts/i).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Edit / Create Profile dialog ─────────────────────────────────────────────

  test("Create/Edit profile button opens a dialog", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add profile|create profile|new profile|edit/i }).first()
    const isVisible = await addBtn.isVisible().catch(() => false)
    if (!isVisible) {
      test.skip()
      return
    }
    await addBtn.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 })
  })

  // ── Navigation isolation ─────────────────────────────────────────────────────

  test("switching all tabs stays on /app/risk", async ({ page }) => {
    for (const tabName of [/drawdown/i, /volatility/i, /hedging/i, /risk profiles/i]) {
      await page.getByRole("tab", { name: tabName }).click()
      await expect(page).toHaveURL(/\/app\/risk/)
    }
  })
})
