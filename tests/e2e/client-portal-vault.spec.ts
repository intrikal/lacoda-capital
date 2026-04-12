import { test, expect, type Page } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same pattern as other client portal specs
//
// The client portal lives at /client/* and is protected by Supabase middleware.
// Set TEST_CLIENT_EMAIL + TEST_CLIENT_PASSWORD in .env.local to run these
// against a real client account. Tests skip gracefully if not authenticated.
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

test.describe("Client portal — Document Vault (/client/vault)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/vault")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client/vault")
    }

    await expect(
      page.getByRole("heading", { name: /document vault/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── Page smoke test ──────────────────────────────────────────────────────────

  test("page loads at /client/vault with correct heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/vault/)
    await expect(page.getByRole("heading", { name: /document vault/i })).toBeVisible()
  })

  test("subtitle describes the vault contents", async ({ page }) => {
    await expect(
      page.getByText(/statements, tax documents, and legal agreements/i)
    ).toBeVisible()
  })

  // ── Document list ────────────────────────────────────────────────────────────

  test("document list renders with at least one document", async ({ page }) => {
    // Card header shows "{n} documents"
    await expect(page.getByText(/\d+ documents?/i)).toBeVisible()
  })

  test("documents show a file name", async ({ page }) => {
    // e.g. "Q4 2024 Statement", "2024 Annual Tax Report"
    await expect(
      page.getByText(/statement|tax report|agreement|deed|verification|policy/i).first()
    ).toBeVisible()
  })

  test("documents show file size and date metadata", async ({ page }) => {
    // Each row has "{size} · {date}" e.g. "1.2 MB · Jan 15, 2025"
    await expect(page.getByText(/MB|KB/).first()).toBeVisible()
    await expect(page.getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i).first()).toBeVisible()
  })

  test("documents show a category badge (Statements, Tax, Legal, or Compliance)", async ({ page }) => {
    await expect(
      page.getByText(/Statements|Tax|Legal|Compliance/).first()
    ).toBeVisible()
  })

  test("each document row has a download button", async ({ page }) => {
    // Download buttons have aria-label "Download {name}"
    const downloadBtns = page.getByRole("button", { name: /^download /i })
    const count = await downloadBtns.count()
    expect(count).toBeGreaterThan(0)
  })

  // ── Search ──────────────────────────────────────────────────────────────────

  test("search input is visible", async ({ page }) => {
    await expect(page.getByPlaceholder(/search documents/i)).toBeVisible()
  })

  test("searching for a known document name narrows the list", async ({ page }) => {
    await page.getByPlaceholder(/search documents/i).fill("Tax")
    // Card header count should drop; Tax documents should still appear
    await expect(page.getByText(/2024 Annual Tax Report/i)).toBeVisible()
  })

  test("searching for a non-existent name shows empty state", async ({ page }) => {
    await page.getByPlaceholder(/search documents/i).fill("xyznonexistent")
    await expect(page.getByText(/no documents match your search/i)).toBeVisible()
  })

  test("clearing search restores the full document list", async ({ page }) => {
    await page.getByPlaceholder(/search documents/i).fill("xyznonexistent")
    await expect(page.getByText(/no documents match your search/i)).toBeVisible()

    await page.getByPlaceholder(/search documents/i).fill("")
    await expect(page.getByText(/\d+ documents?/i)).toBeVisible()
  })

  // ── Category filter ──────────────────────────────────────────────────────────

  test("all category filter buttons are visible: All, Statements, Tax, Legal, Compliance", async ({ page }) => {
    await expect(page.getByRole("button", { name: "All" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Statements" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Tax" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Legal" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Compliance" })).toBeVisible()
  })

  test("clicking Tax filter shows only tax documents", async ({ page }) => {
    await page.getByRole("button", { name: "Tax" }).click()
    await expect(page.getByText(/Annual Tax Report/i).first()).toBeVisible()
    // Legal documents should not be visible
    await expect(page.getByText(/Account Agreement/i)).not.toBeVisible({ timeout: 3_000 })
  })

  test("clicking Legal filter shows only legal documents", async ({ page }) => {
    await page.getByRole("button", { name: "Legal" }).click()
    await expect(page.getByText(/Account Agreement|Property Deed|Investment Policy/i).first()).toBeVisible()
    // Tax documents should not be visible
    await expect(page.getByText(/Annual Tax Report/i)).not.toBeVisible({ timeout: 3_000 })
  })

  test("clicking Statements filter shows only statement documents", async ({ page }) => {
    await page.getByRole("button", { name: "Statements" }).click()
    await expect(page.getByText(/Statement/i).first()).toBeVisible()
  })

  test("clicking Compliance filter shows only compliance documents", async ({ page }) => {
    await page.getByRole("button", { name: "Compliance" }).click()
    await expect(page.getByText(/KYC Verification/i)).toBeVisible()
    await expect(page.getByText(/Annual Tax Report/i)).not.toBeVisible({ timeout: 3_000 })
  })

  test("clicking All filter after a category filter restores full list", async ({ page }) => {
    await page.getByRole("button", { name: "Tax" }).click()
    await expect(page.getByText(/Account Agreement/i)).not.toBeVisible({ timeout: 3_000 })

    await page.getByRole("button", { name: "All" }).click()
    await expect(page.getByText(/Account Agreement/i)).toBeVisible({ timeout: 3_000 })
  })

  // ── Sidebar navigation ────────────────────────────────────────────────────────

  test("sidebar is visible on the vault page", async ({ page }) => {
    await expect(page.locator("aside")).toBeVisible()
  })
})
