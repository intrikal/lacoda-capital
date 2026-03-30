import { test, expect, type Page } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper
//
// The client portal lives at /client/* and is protected by Supabase middleware.
// Set TEST_CLIENT_EMAIL + TEST_CLIENT_PASSWORD in .env.local to run these
// against a real client account. Tests skip gracefully if not authenticated.
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

test.describe("Client portal — Overview (/client)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client")
    }

    // Wait for the page heading to confirm the portal loaded
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 })
  })

  test("page loads at /client and shows a welcome heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client$/)
    // The page renders "Welcome back, John" — match loosely in case the name changes
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/welcome back/i)
  })

  test("YTD Return KPI card is visible", async ({ page }) => {
    await expect(page.getByText(/ytd return/i)).toBeVisible()
    // Value is hardcoded as +12.8%
    await expect(page.getByText("+12.8%")).toBeVisible()
  })

  test("Net Worth KPI card is visible", async ({ page }) => {
    await expect(page.getByText(/net worth/i)).toBeVisible()
  })

  test("Total Portfolio Value card is visible", async ({ page }) => {
    await expect(page.getByText(/total portfolio value/i)).toBeVisible()
  })

  test("sidebar navigation is visible with key links", async ({ page }) => {
    const sidebar = page.locator("aside")
    await expect(sidebar).toBeVisible()

    // Nav links present in the client layout
    await expect(sidebar.getByRole("link", { name: "Overview" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Messages" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Settings" })).toBeVisible()
  })

  test("clicking Messages in sidebar navigates to /client/messages", async ({ page }) => {
    await page.locator("aside").getByRole("link", { name: "Messages" }).click()
    await expect(page).toHaveURL(/\/client\/messages/, { timeout: 5_000 })
  })

  test("clicking Asset in sidebar navigates to /client/assets", async ({ page }) => {
    await page.locator("aside").getByRole("link", { name: "Asset" }).click()
    await expect(page).toHaveURL(/\/client\/assets/, { timeout: 5_000 })
  })

  test("Financial Goals card is visible", async ({ page }) => {
    await expect(page.getByText("Financial Goals")).toBeVisible()
  })

  test("Recent Activity card is visible", async ({ page }) => {
    await expect(page.getByText("Recent Activity")).toBeVisible()
  })
})
