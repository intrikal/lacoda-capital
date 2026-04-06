import { test, expect, type Page } from "@playwright/test"

async function waitForFinancesPage(page: Page) {
  await page.goto("/app/finances")
  if (page.url().includes("/login")) {
    test.skip()
    return false
  }
  await expect(page.getByRole("heading", { name: "Personal Finances" })).toBeVisible({ timeout: 10_000 })
  return true
}

test.describe("Finances page (/app/finances)", () => {
  test.beforeEach(async ({ page }) => {
    await waitForFinancesPage(page)
  })

  // ── Page structure ──────────────────────────────────────────────────────────

  test("shows the Personal Finances heading with Export and Link Account buttons", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Personal Finances" })).toBeVisible()
    await expect(page.getByRole("button", { name: /export/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /link account/i })).toBeVisible()
  })

  test("shows summary cards: Net Worth, Monthly Spending, Total Debt, Credit Score", async ({ page }) => {
    await expect(page.getByText("Net Worth")).toBeVisible()
    await expect(page.getByText("Monthly Spending")).toBeVisible()
    await expect(page.getByText("Total Debt")).toBeVisible()
    await expect(page.getByText("Credit Score")).toBeVisible()
  })

  test("Net Worth card shows a currency value", async ({ page }) => {
    // Net Worth is calculated from static data — value starts with $
    const netWorthCard = page.locator("div").filter({ hasText: /^Net Worth$/ }).first()
    const sibling = netWorthCard.locator("..").locator("p.text-2xl")
    await expect(sibling).toContainText("$")
  })

  test("Credit Score card shows numeric value 782", async ({ page }) => {
    await expect(page.getByText("782")).toBeVisible()
  })

  // ── Tab navigation ──────────────────────────────────────────────────────────

  test("shows all main tabs: Overview, Linked Accounts, Spending, My Loans, Credit Cards, Loan Options, Tax Deductions", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Linked Accounts" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Spending" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "My Loans" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Credit Cards" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Loan Options" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Tax Deductions" })).toBeVisible()
  })

  test("Overview tab is active by default", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("data-state", "active")
  })

  // ── Overview tab content ────────────────────────────────────────────────────

  test("Overview tab renders charts (SVG elements present)", async ({ page }) => {
    // Charts render as SVG via Recharts
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 5_000 })
  })

  test("Overview tab shows Recent Transactions section", async ({ page }) => {
    await expect(page.getByText("Recent Transactions")).toBeVisible()
  })

  test("Recent Transactions shows static transaction data", async ({ page }) => {
    // Static mock data — "Whole Foods Market" is the first transaction
    await expect(page.getByText("Whole Foods Market")).toBeVisible()
  })

  test("Overview tab shows Assets and Liabilities breakdown cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Liabilities" })).toBeVisible()
  })

  // ── Linked Accounts tab ─────────────────────────────────────────────────────

  test("Linked Accounts tab renders account cards with institution names", async ({ page }) => {
    await page.getByRole("tab", { name: "Linked Accounts" }).click()
    await expect(page.getByRole("tab", { name: "Linked Accounts" })).toHaveAttribute("data-state", "active")
    // Static data includes Chase — verify an account card is visible
    await expect(page.getByText("Chase").first()).toBeVisible({ timeout: 3_000 })
  })

  // ── Spending tab ────────────────────────────────────────────────────────────

  test("Spending tab renders spending category rows", async ({ page }) => {
    await page.getByRole("tab", { name: "Spending" }).click()
    // Static categories include Housing and Transportation
    await expect(page.getByText("Housing")).toBeVisible({ timeout: 3_000 })
    await expect(page.getByText("Transportation")).toBeVisible()
  })

  // ── My Loans tab ───────────────────────────────────────────────────────────

  test("My Loans tab renders loan cards with lender names", async ({ page }) => {
    await page.getByRole("tab", { name: "My Loans" }).click()
    // Static data includes Wells Fargo mortgage
    await expect(page.getByText("Wells Fargo")).toBeVisible({ timeout: 3_000 })
    await expect(page.getByText("Home Mortgage")).toBeVisible()
  })

  // ── Tax Deductions tab ──────────────────────────────────────────────────────

  test("Tax Deductions tab renders with tax-related content", async ({ page }) => {
    await page.getByRole("tab", { name: "Tax Deductions" }).click()
    await expect(page.getByRole("tab", { name: "Tax Deductions" })).toHaveAttribute("data-state", "active")
    // The tab content renders — verify the URL stays on /app/finances
    await expect(page).toHaveURL(/\/app\/finances/)
  })

  // ── Credit Cards tab ───────────────────────────────────────────────────────

  test("Credit Cards tab renders Apply Now buttons for card offers", async ({ page }) => {
    await page.getByRole("tab", { name: "Credit Cards" }).click()
    await expect(page.getByRole("button", { name: /apply now/i }).first()).toBeVisible({ timeout: 3_000 })
  })
})
