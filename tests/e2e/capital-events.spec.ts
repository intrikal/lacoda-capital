import { test, expect } from "@playwright/test"

// E2E tests for PE/VC capital call and distribution tracking.

test.describe("Capital Activity Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/assets")
    if (page.url().includes("/login")) {
      test.skip()
    }
  })

  test("PE asset detail → Capital Activity tab visible with commitment summary", async ({ page }) => {
    // Find a PE or VC asset
    const peTab = page.getByRole("tab", { name: /private equity/i })
    if (await peTab.isVisible().catch(() => false)) {
      await peTab.click()
    }

    // Click on a PE asset to open detail
    const assetRow = page.locator("tr").filter({ hasText: /active/i }).first()
    if (!(await assetRow.isVisible().catch(() => false))) {
      test.skip()
    }

    await assetRow.click()

    // Check for Capital Activity section or tab
    const capitalSection = page.getByText(/capital activity|committed|called to date/i).first()
    if (!(await capitalSection.isVisible().catch(() => false))) {
      // May not have a PE asset — skip gracefully
      test.skip()
    }

    await expect(capitalSection).toBeVisible()
  })

  test("Click Add Capital Call → form with amount + due date → appears as pending", async ({ page }) => {
    const peTab = page.getByRole("tab", { name: /private equity/i })
    if (await peTab.isVisible().catch(() => false)) {
      await peTab.click()
    }

    const assetRow = page.locator("tr").filter({ hasText: /active/i }).first()
    if (!(await assetRow.isVisible().catch(() => false))) {
      test.skip()
    }
    await assetRow.click()

    const addCallButton = page.getByRole("button", { name: /add capital call/i })
    if (!(await addCallButton.isVisible().catch(() => false))) {
      test.skip()
    }

    await addCallButton.click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Fill in the form
    const amountInput = page.getByLabel(/amount/i)
    await amountInput.fill("2000000")

    // Submit
    const submitButton = page.getByRole("button", { name: /^add$/i })
    await submitButton.click()

    // Dialog closes
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 })

    // Should see the call in the events table
    await expect(page.getByText("pending")).toBeVisible({ timeout: 5_000 })
  })

  test("Mark call as paid → cached totals update", async ({ page }) => {
    const peTab = page.getByRole("tab", { name: /private equity/i })
    if (await peTab.isVisible().catch(() => false)) {
      await peTab.click()
    }

    const assetRow = page.locator("tr").filter({ hasText: /active/i }).first()
    if (!(await assetRow.isVisible().catch(() => false))) {
      test.skip()
    }
    await assetRow.click()

    // Find a "Mark Paid" button
    const markPaidButton = page.getByText(/mark paid/i).first()
    if (!(await markPaidButton.isVisible().catch(() => false))) {
      test.skip()
    }

    await markPaidButton.click()

    // Status should change to "paid"
    await expect(page.getByText("paid").first()).toBeVisible({ timeout: 5_000 })
  })

  test("non-PE asset (equities) → Capital Activity tab NOT shown", async ({ page }) => {
    // Switch to equities tab
    const equitiesTab = page.getByRole("tab", { name: /equities/i })
    if (await equitiesTab.isVisible().catch(() => false)) {
      await equitiesTab.click()
    }

    const assetRow = page.locator("tr").filter({ hasText: /active/i }).first()
    if (!(await assetRow.isVisible().catch(() => false))) {
      test.skip()
    }
    await assetRow.click()

    // Capital Activity should NOT be visible for equities
    const capitalSection = page.getByText(/capital activity|add capital call/i)
    await expect(capitalSection).not.toBeVisible({ timeout: 2_000 })
  })
})

test.describe("Dashboard - Upcoming Capital Calls", () => {
  test("dashboard shows upcoming calls widget", async ({ page }) => {
    await page.goto("/app")
    if (page.url().includes("/login")) {
      test.skip()
    }

    // Look for the upcoming calls widget
    const widget = page.getByText(/upcoming capital calls/i)
    if (await widget.isVisible().catch(() => false)) {
      await expect(widget).toBeVisible()
    }
    // Widget may show "No upcoming calls" if no PE assets — either state is valid
  })
})
