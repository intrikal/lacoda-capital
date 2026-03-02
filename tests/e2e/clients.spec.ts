import { test, expect } from "@playwright/test"

// These E2E tests run against the real Next.js dev server.
// They require a logged-in session — in CI, set up auth state via storageState.
// For local runs you must be authenticated at http://localhost:3000.

test.describe("Clients page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the clients page (middleware will redirect to /login if not authed)
    await page.goto("/app/clients")
    // If redirected to login, skip — auth fixtures are handled separately in CI
    if (page.url().includes("/login")) {
      test.skip()
    }
  })

  test("shows the page header and Add Client button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible()
    await expect(page.getByRole("button", { name: /add client/i })).toBeVisible()
  })

  test("opens the create form when Add Client is clicked", async ({ page }) => {
    await page.getByRole("button", { name: /add client/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText("Add New Client")).toBeVisible()
  })

  test("can create a new client", async ({ page }) => {
    await page.getByRole("button", { name: /add client/i }).click()

    await page.getByLabel(/full name/i).fill("E2E Test Client")
    await page.getByLabel(/email/i).fill("e2e@test.com")
    await page.getByRole("button", { name: /add client/i }).last().click()

    // Dialog should close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 })

    // New client appears in the list
    await expect(page.getByText("E2E Test Client")).toBeVisible({ timeout: 5_000 })
  })

  test("shows validation error for empty name on submit", async ({ page }) => {
    await page.getByRole("button", { name: /add client/i }).click()
    // Submit without filling in the name
    await page.getByRole("button", { name: /add client/i }).last().click()
    // Dialog should still be open
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("can edit a client", async ({ page }) => {
    // Open actions dropdown for first client row
    const firstRow = page.getByTestId("client-row").first()
    await firstRow.hover()
    await firstRow.getByLabel("Client actions").click()
    await page.getByRole("menuitem", { name: /edit/i }).click()

    await expect(page.getByText("Edit Client")).toBeVisible()

    // Clear and retype the name
    const nameInput = page.getByLabel(/full name/i)
    await nameInput.clear()
    await nameInput.fill("Updated Client Name")
    await page.getByRole("button", { name: /save changes/i }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText("Updated Client Name")).toBeVisible({ timeout: 5_000 })
  })

  test("shows delete confirmation before deleting", async ({ page }) => {
    const firstRow = page.getByTestId("client-row").first()
    await firstRow.hover()
    await firstRow.getByLabel("Client actions").click()
    await page.getByRole("menuitem", { name: /delete/i }).click()

    // Confirmation dialog appears
    await expect(page.getByText("Delete client?")).toBeVisible()
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /^delete$/i })).toBeVisible()
  })

  test("can cancel a delete", async ({ page }) => {
    const firstRow = page.getByTestId("client-row").first()
    const clientName = await firstRow.locator(".text-zinc-100").first().textContent()

    await firstRow.hover()
    await firstRow.getByLabel("Client actions").click()
    await page.getByRole("menuitem", { name: /delete/i }).click()
    await page.getByRole("button", { name: /cancel/i }).click()

    // Client should still be in the list
    await expect(page.getByText(clientName!)).toBeVisible()
  })

  test("client row opens detail drawer on click", async ({ page }) => {
    await page.getByTestId("client-row").first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText("Assets Under Management")).toBeVisible()
  })

  test("search filters clients by name", async ({ page }) => {
    const search = page.getByPlaceholder(/search clients/i)
    await search.fill("zzz-no-match-xyz")
    await expect(page.getByText(/no clients match/i)).toBeVisible()
  })
})
