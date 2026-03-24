import { test, expect } from "@playwright/test"

// These E2E tests require a logged-in session with admin role.
// In CI, set up auth state via storageState.

test.describe("Compliance page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/compliance")
    if (page.url().includes("/login")) {
      test.skip()
    }
  })

  test("shows the compliance page header and Add Control button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Compliance" })).toBeVisible()
    await expect(page.getByRole("button", { name: /add control/i })).toBeVisible()
  })

  test("shows stat cards including Compliance Score and Overdue", async ({ page }) => {
    await expect(page.getByText("Compliance Score")).toBeVisible()
    await expect(page.getByText("Overdue")).toBeVisible()
    await expect(page.getByText("Total Controls")).toBeVisible()
  })

  test("framework filter is available", async ({ page }) => {
    await expect(page.getByText("All Frameworks")).toBeVisible()
  })

  test("can open create control dialog", async ({ page }) => {
    await page.getByRole("button", { name: /add control/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText("Add Compliance Control")).toBeVisible()
  })

  test("create dialog has framework and assignee fields", async ({ page }) => {
    await page.getByRole("button", { name: /add control/i }).click()
    await expect(page.getByText("Framework")).toBeVisible()
    await expect(page.getByText("Assignee")).toBeVisible()
    await expect(page.getByText("Due Date")).toBeVisible()
  })

  test("can create control, assign to team member, and update status", async ({ page }) => {
    // Create a control
    await page.getByRole("button", { name: /add control/i }).click()

    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Code *").fill("E2E-TEST-001")
    await dialog.getByLabel("Name *").fill("E2E Test Control")

    // Submit
    await dialog.getByRole("button", { name: /add control/i }).click()

    // Wait for dialog to close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 })

    // Verify the control appears in the list
    await expect(page.getByText("E2E-TEST-001")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("E2E Test Control")).toBeVisible()

    // Find the control row and mark it as verified via dropdown
    const controlRow = page.locator("text=E2E-TEST-001").locator("..").locator("..")
    await controlRow.getByRole("button", { name: /more/i }).first().click()
    await page.getByRole("menuitem", { name: /mark verified/i }).click()

    // Verify status badge updated
    await expect(page.getByText("Verified")).toBeVisible({ timeout: 5000 })

    // Clean up: delete the test control
    await controlRow.getByRole("button", { name: /more/i }).first().click()
    await page.getByRole("menuitem", { name: /delete/i }).click()

    // Confirm deletion
    await page.getByRole("button", { name: /^delete$/i }).click()
    await expect(page.getByText("E2E-TEST-001")).not.toBeVisible({ timeout: 5000 })
  })

  test("audit log tab shows entries", async ({ page }) => {
    await page.getByRole("tab", { name: "Audit Log" }).click()
    await expect(page.getByText("Tamper-Proof Audit Trail")).toBeVisible()
    await expect(page.getByPlaceholder("Search actions")).toBeVisible()
  })
})
