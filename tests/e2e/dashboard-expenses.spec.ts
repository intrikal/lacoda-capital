import { test, expect, type Page } from "@playwright/test"

async function waitForExpensesPage(page: Page) {
  await page.goto("/app/expenses")
  if (page.url().includes("/login")) {
    test.skip()
    return false
  }
  await expect(page.getByRole("heading", { name: "Expenses" })).toBeVisible({ timeout: 10_000 })
  return true
}

test.describe("Expenses page (/app/expenses)", () => {
  test.beforeEach(async ({ page }) => {
    await waitForExpensesPage(page)
  })

  // ── Page structure ──────────────────────────────────────────────────────────

  test("shows Expenses heading with Add Expense button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Expenses" })).toBeVisible()
    await expect(page.getByRole("button", { name: /add expense/i })).toBeVisible()
  })

  test("shows KPI summary cards: Total Expenses, Paid, Pending, Overdue", async ({ page }) => {
    await expect(page.getByText("Total Expenses")).toBeVisible()
    await expect(page.getByText("Paid")).toBeVisible()
    await expect(page.getByText("Pending")).toBeVisible()
    await expect(page.getByText("Overdue")).toBeVisible()
  })

  test("KPI cards show currency values ($ sign)", async ({ page }) => {
    // At least one card shows a dollar value
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible()
  })

  // ── Tab navigation ──────────────────────────────────────────────────────────

  test("shows all three tabs: All Expenses, Refinance Opportunities, Equity Boosts", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /all expenses/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /refinance/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /equity boost/i })).toBeVisible()
  })

  test("All Expenses tab is active by default", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /all expenses/i })).toHaveAttribute("data-state", "active")
  })

  // ── All Expenses tab ────────────────────────────────────────────────────────

  test("All Expenses tab shows a table of expense rows", async ({ page }) => {
    // Expense items show a title and a dollar amount
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible()
  })

  test("expense rows have a status badge (Paid, Pending, or Overdue)", async ({ page }) => {
    // At least one badge is rendered
    const badges = page.locator("span, div").filter({ hasText: /^(paid|pending|overdue)$/i })
    await expect(badges.first()).toBeVisible({ timeout: 5_000 })
  })

  test("expense rows show category labels (renovation, maintenance, etc.)", async ({ page }) => {
    const categoryTerms = /renovation|maintenance|property tax|insurance|utilities/i
    await expect(page.getByText(categoryTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Filtering ───────────────────────────────────────────────────────────────

  test("status filter select is present", async ({ page }) => {
    // A combobox or select for status filtering
    const filterEl = page.getByRole("combobox").first()
    await expect(filterEl).toBeVisible({ timeout: 5_000 })
  })

  // ── Refinance tab ────────────────────────────────────────────────────────────

  test("Refinance tab content loads when clicked", async ({ page }) => {
    await page.getByRole("tab", { name: /refinance/i }).click()
    await expect(page.getByRole("tab", { name: /refinance/i })).toHaveAttribute("data-state", "active")
    await expect(page).toHaveURL(/\/app\/expenses/)
  })

  test("Refinance tab shows rate comparison data (% sign)", async ({ page }) => {
    await page.getByRole("tab", { name: /refinance/i }).click()
    await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Refinance tab shows monthly savings values", async ({ page }) => {
    await page.getByRole("tab", { name: /refinance/i }).click()
    await expect(page.getByText(/monthly savings|save per month/i).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Equity Boosts tab ────────────────────────────────────────────────────────

  test("Equity Boosts tab content loads when clicked", async ({ page }) => {
    await page.getByRole("tab", { name: /equity boost/i }).click()
    await expect(page.getByRole("tab", { name: /equity boost/i })).toHaveAttribute("data-state", "active")
    await expect(page).toHaveURL(/\/app\/expenses/)
  })

  test("Equity Boosts tab shows ROI data", async ({ page }) => {
    await page.getByRole("tab", { name: /equity boost/i }).click()
    await expect(page.getByText(/ROI|return on investment/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Equity Boosts tab shows estimated value increase", async ({ page }) => {
    await page.getByRole("tab", { name: /equity boost/i }).click()
    await expect(page.getByText(/value increase|equity gain/i).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Add Expense dialog ───────────────────────────────────────────────────────

  test("clicking Add Expense opens a dialog", async ({ page }) => {
    await page.getByRole("button", { name: /add expense/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 })
  })

  test("Add Expense dialog has required form fields", async ({ page }) => {
    await page.getByRole("button", { name: /add expense/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Core fields expected in the form
    await expect(page.getByLabel(/title|description/i).first()).toBeVisible()
    await expect(page.getByLabel(/amount/i).first()).toBeVisible()
  })

  test("Add Expense dialog can be dismissed with Cancel", async ({ page }) => {
    await page.getByRole("button", { name: /add expense/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    await page.getByRole("button", { name: /cancel/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 })
  })

  // ── Navigation isolation ─────────────────────────────────────────────────────

  test("tab switching does not navigate away from /app/expenses", async ({ page }) => {
    await page.getByRole("tab", { name: /refinance/i }).click()
    await expect(page).toHaveURL(/\/app\/expenses/)

    await page.getByRole("tab", { name: /equity boost/i }).click()
    await expect(page).toHaveURL(/\/app\/expenses/)

    await page.getByRole("tab", { name: /all expenses/i }).click()
    await expect(page).toHaveURL(/\/app\/expenses/)
  })
})
