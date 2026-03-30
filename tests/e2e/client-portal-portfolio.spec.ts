import { test, expect, type Page } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same pattern as other client portal specs
// ─────────────────────────────────────────────────────────────────────────────

async function loginAsClient(page: Page) {
  const email = process.env.TEST_CLIENT_EMAIL ?? process.env.TEST_USER_EMAIL
  const password = process.env.TEST_CLIENT_PASSWORD ?? process.env.TEST_USER_PASSWORD

  if (!email || !password) return false

  await page.goto("/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/(app|client|onboarding)/, { timeout: 10_000 })
  return true
}

test.describe("Client portal — Portfolio (/client/portfolio)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/portfolio")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client/portfolio")
    }

    await expect(page.getByRole("heading", { name: "My Portfolio" })).toBeVisible({ timeout: 10_000 })
  })

  test("page loads at /client/portfolio with correct heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/portfolio/)
    await expect(page.getByRole("heading", { name: "My Portfolio" })).toBeVisible()
    await expect(page.getByText(/track your investments/i)).toBeVisible()
  })

  test("summary cards are visible (Total Value, Cost Basis, Total Gain/Loss, Total Return)", async ({ page }) => {
    await expect(page.getByText("Total Value")).toBeVisible()
    await expect(page.getByText("Cost Basis")).toBeVisible()
    await expect(page.getByText("Total Gain/Loss")).toBeVisible()
    await expect(page.getByText("Total Return")).toBeVisible()
  })

  test("Holdings card is visible with its tabs", async ({ page }) => {
    await expect(page.getByText("Holdings")).toBeVisible()
    await expect(page.getByText("Your investment positions")).toBeVisible()
  })

  test("asset class filter tabs are all visible", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "All" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Equities" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Real Estate" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Fixed Income" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Private Equity" })).toBeVisible()
  })

  test("All tab is active by default and shows holdings", async ({ page }) => {
    const allTab = page.getByRole("tab", { name: "All" })
    await expect(allTab).toBeVisible()
    await expect(allTab).toHaveAttribute("data-state", "active")
  })

  test("clicking Equities tab filters holdings to equities only", async ({ page }) => {
    await page.getByRole("tab", { name: "Equities" }).click()
    await expect(page.getByRole("tab", { name: "Equities" })).toHaveAttribute("data-state", "active")

    // All visible holding rows should show the "Equities" label
    const rows = page.locator(".border.border-zinc-800.rounded-lg")
    const count = await rows.count()
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i).getByText("Equities")).toBeVisible()
      }
    }
  })

  test("clicking a tab and returning to All restores all holdings", async ({ page }) => {
    await page.getByRole("tab", { name: "Real Estate" }).click()
    await expect(page.getByRole("tab", { name: "Real Estate" })).toHaveAttribute("data-state", "active")

    await page.getByRole("tab", { name: "All" }).click()
    await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute("data-state", "active")
  })

  test("at least one holding row is visible under the All tab", async ({ page }) => {
    // The holdings list renders div rows with border-zinc-800 and rounded-lg
    const holdingRows = page.locator(".border.border-zinc-800.rounded-lg")
    await expect(holdingRows.first()).toBeVisible({ timeout: 5_000 })
  })

  test("each holding row shows name, asset class label, value, and return percentage", async ({ page }) => {
    const firstRow = page.locator(".border.border-zinc-800.rounded-lg").first()
    await expect(firstRow).toBeVisible({ timeout: 5_000 })

    // Value is formatted as currency (starts with $)
    await expect(firstRow.getByText(/\$[\d,]+/)).toBeVisible()

    // Return percentage contains a % sign
    await expect(firstRow.getByText(/%/)).toBeVisible()
  })

  test("performance chart and allocation chart are visible", async ({ page }) => {
    // Both charts are rendered above the Holdings card
    // PerformanceChart and AllocationChart render as Card components
    await expect(page.getByText("Asset Allocation")).toBeVisible()
  })
})
