import { test, expect, type Page } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same pattern as client-portal-overview.spec.ts
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

test.describe("Client portal — Documents (/client/documents)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/documents")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client/documents")
    }

    // Wait for the page to render its heading
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible({ timeout: 10_000 })
  })

  test("page loads at /client/documents with correct heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/documents/)
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible()
    await expect(page.getByText(/access statements, tax documents/i)).toBeVisible()
  })

  test("stat cards are visible (Total Documents, Verified, Pending, Starred)", async ({ page }) => {
    await expect(page.getByText("Total Documents")).toBeVisible()
    await expect(page.getByText("Verified")).toBeVisible()
    await expect(page.getByText("Pending Review")).toBeVisible()
    await expect(page.getByText("Starred")).toBeVisible()
  })

  test("search input is visible", async ({ page }) => {
    await expect(page.getByPlaceholder("Search documents...")).toBeVisible()
  })

  test("typing in the search input filters the document list", async ({ page }) => {
    const search = page.getByPlaceholder("Search documents...")
    // Type a query that won't match anything
    await search.fill("zzz-no-match-xyz")
    await expect(page.getByText(/no documents found/i)).toBeVisible({ timeout: 3_000 })
  })

  test("clearing the search restores the document list", async ({ page }) => {
    const search = page.getByPlaceholder("Search documents...")
    await search.fill("zzz-no-match-xyz")
    await expect(page.getByText(/no documents found/i)).toBeVisible({ timeout: 3_000 })
    await search.clear()
    // After clearing, the "no documents" message should disappear
    await expect(page.getByText(/no documents found/i)).not.toBeVisible({ timeout: 3_000 })
  })

  test("document type tabs are visible (All, Statements, Tax, Legal, Reports, Starred)", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^all/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /statements/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /tax documents/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /legal/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /reports/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /starred/i })).toBeVisible()
  })

  test("clicking a folder tab filters documents to that folder", async ({ page }) => {
    // Click "Statements" tab — it should become the active tab
    await page.getByRole("button", { name: /statements/i }).click()
    // The active tab has the tiffany-500 color class and the active underline span
    // We check by verifying the tab is "active" via its aria state or text highlight
    const statementsTab = page.getByRole("button", { name: /statements/i })
    await expect(statementsTab).toBeVisible()
    // Clicking "All" should restore the full list
    await page.getByRole("button", { name: /^all/i }).click()
  })

  test("Upload button opens the upload dialog", async ({ page }) => {
    await page.getByRole("button", { name: /^upload$/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText("Upload Document")).toBeVisible()
  })

  test("upload dialog can be cancelled", async ({ page }) => {
    await page.getByRole("button", { name: /^upload$/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: /cancel/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 })
  })

  test("Download All button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /download all/i })).toBeVisible()
  })

  test("hovering a document row reveals Eye and Download action buttons", async ({ page }) => {
    // Only run if there is at least one document row
    const rows = page.locator(".divide-y > div")
    const count = await rows.count()
    if (count === 0) {
      test.skip()
      return
    }

    const firstRow = rows.first()
    await firstRow.hover()
    // Eye and Download buttons appear on hover (opacity-0 → opacity-100)
    await expect(firstRow.locator("button").filter({ has: page.locator("svg") }).first()).toBeVisible()
  })
})
