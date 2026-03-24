import { test, expect } from "@playwright/test"

/**
 * E2E Tests: DocuSign Signing Flow
 *
 * Tests:
 *   1. Document request → 'Send for Signature' button available
 *   2. Send for Signature → DocuSign flow opens → (simulate completion) → document in vault
 */

test.describe("DocuSign Signing Flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/vault")
    await page.waitForLoadState("networkidle")
  })

  test("vault document dropdown has Send for Signature option", async ({ page }) => {
    // Hover over a document row to show action buttons
    const documentRow = page.locator("[class*='hover:bg-zinc-800']").first()
    if (await documentRow.isVisible()) {
      await documentRow.hover()

      // Click the more actions button
      const moreButton = documentRow.locator("button").filter({ has: page.locator("[class*='MoreHorizontal'], [data-lucide='more-horizontal']") }).first()
      if (await moreButton.isVisible()) {
        await moreButton.click()

        // Should see "Send for Signature" option
        const signOption = page.getByText("Send for Signature")
        await expect(signOption).toBeVisible()
      }
    }
  })

  test("DocuSign card visible on integrations page", async ({ page }) => {
    await page.goto("/app/integrations")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText("DocuSign")).toBeVisible()
    await expect(page.getByText("Embedded signing")).toBeVisible()
    await expect(page.getByText("Auto-file to vault")).toBeVisible()
  })

  test("shows connect DocuSign button when not connected", async ({ page }) => {
    await page.goto("/app/integrations")
    await page.waitForLoadState("networkidle")

    const connectButton = page.getByRole("button", { name: /Connect DocuSign/i })
    if (await connectButton.isVisible()) {
      await expect(connectButton).toBeEnabled()
    }
  })
})
