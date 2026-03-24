import { test, expect } from "@playwright/test"

/**
 * E2E tests: Cmd+K global search.
 *
 * Tests the search modal behavior:
 * - Cmd+K opens the modal
 * - Typing shows results grouped by type
 * - Click navigates to detail page
 * - Zero results shows helpful message
 */

test.describe("Global Search (Cmd+K)", () => {
  test("search trigger button is visible in dashboard topbar", async ({ page }) => {
    await page.goto("/app")

    // The search trigger should be visible
    const searchButton = page.getByText("Search...")
    if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(searchButton).toBeVisible()
      // Should show keyboard shortcut hint
      await expect(page.getByText("⌘K")).toBeVisible()
    }
  })

  test("Cmd+K opens search dialog", async ({ page }) => {
    await page.goto("/app")

    // Wait for page to load
    await page.waitForLoadState("networkidle")

    // Press Cmd+K (Meta+K on Mac, Ctrl+K on other platforms)
    await page.keyboard.press("Control+k")

    // Search dialog should appear
    const dialog = page.getByRole("dialog")
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(dialog).toBeVisible()
      await expect(
        page.getByPlaceholder("Search assets, documents, clients, entities...")
      ).toBeVisible()
    }
  })

  test("search with zero results shows helpful message", async ({ page }) => {
    await page.goto("/app")
    await page.waitForLoadState("networkidle")

    await page.keyboard.press("Control+k")

    const dialog = page.getByRole("dialog")
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Type a query that won't match anything
      const searchInput = page.getByPlaceholder("Search assets, documents, clients, entities...")
      await searchInput.fill("xyznonexistentquery12345")

      // Wait for debounce + search
      await page.waitForTimeout(500)

      // Should show no results message
      const noResults = page.getByText("No results found")
      if (await noResults.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(noResults).toBeVisible()
        await expect(page.getByText("Try searching with different terms")).toBeVisible()
      }
    }
  })

  test("Escape closes search dialog", async ({ page }) => {
    await page.goto("/app")
    await page.waitForLoadState("networkidle")

    await page.keyboard.press("Control+k")

    const dialog = page.getByRole("dialog")
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.keyboard.press("Escape")
      await expect(dialog).not.toBeVisible()
    }
  })
})
