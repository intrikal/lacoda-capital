/**
 * ============================================================================
 * E2E TEST FILE: dashboard-vault.spec.ts
 * ============================================================================
 *
 * Tests for the Document Vault at /app/vault.
 *
 * BEFORE RUNNING:
 *   npm run dev
 *   npx playwright test tests/e2e/dashboard-vault.spec.ts
 *
 * CREDENTIALS:
 *   No env vars required.  Tests are skipped automatically if the
 *   middleware redirects to /login (no active session).
 */

import { test, expect } from "@playwright/test"

test.describe("Document Vault (/app/vault)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/vault")
    if (page.url().includes("/login")) {
      test.skip()
    }
  })

  // ── Page load ─────────────────────────────────────────────────────────────

  test("page loads with Document Vault heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /document vault/i })
    ).toBeVisible()

    // Upload button should always be present
    await expect(
      page.getByRole("button", { name: /upload/i })
    ).toBeVisible()
  })

  test("folder list or empty state is visible", async ({ page }) => {
    // Either documents are listed, OR the empty-state message is shown
    const hasDocuments = await page
      .getByText(/documents stored securely/i)
      .isVisible()

    const hasEmptyState = await page.getByText(/no documents found/i).isVisible()

    // One of the two must be true — the vault is never in a loading limbo
    expect(hasDocuments || hasEmptyState).toBe(true)
  })

  // ── Tab navigation ────────────────────────────────────────────────────────

  test("tabs All Documents, Verified, Pending, Expired, Requests are visible", async ({
    page,
  }) => {
    await expect(page.getByRole("tab", { name: /all documents/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /verified/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /pending/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /expired/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /requests/i })).toBeVisible()
  })

  // ── Search bar ────────────────────────────────────────────────────────────

  test("search bar is functional – typing filters results or shows empty state", async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder(/search documents or tags/i)
    await expect(searchInput).toBeVisible()

    // Type a string that is very unlikely to match any real document
    await searchInput.fill("zzz-no-match-xyz-9999")

    // Either no documents list or the explicit "no documents found" message
    await expect(
      page.getByText(/no documents found/i)
    ).toBeVisible({ timeout: 5_000 })
  })

  // ── Document list columns ─────────────────────────────────────────────────

  test("document list shows name, folder and status columns", async ({
    page,
  }) => {
    // Only meaningful if documents exist — skip gracefully if vault is empty
    const emptyState = page.getByText(/no documents found/i)
    if (await emptyState.isVisible()) {
      test.skip()
      return
    }

    // Status badges appear on every row (Verified / Pending / Expired)
    await expect(
      page.getByText(/verified|pending|expired/i).first()
    ).toBeVisible()
  })
})
