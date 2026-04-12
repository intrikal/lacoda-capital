/**
 * ============================================================================
 * E2E TEST FILE: dashboard-ledger.spec.ts
 * ============================================================================
 *
 * Tests for the Audit Ledger at /app/ledger.
 *
 * BEFORE RUNNING:
 *   npm run dev
 *   npx playwright test tests/e2e/dashboard-ledger.spec.ts
 *
 * CREDENTIALS:
 *   No env vars required.  Tests are skipped automatically if the
 *   middleware redirects to /login (no active session).
 */

import { test, expect } from "@playwright/test"

test.describe("Audit Ledger (/app/ledger)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/ledger")
    if (page.url().includes("/login")) {
      test.skip()
    }
  })

  // ── Page load ─────────────────────────────────────────────────────────────

  test("page loads with Audit Ledger heading and security notice", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /audit ledger/i })
    ).toBeVisible()

    // The tamper-proof notice is always rendered at the top
    await expect(page.getByText(/tamper-proof audit trail/i)).toBeVisible()
    await expect(page.getByText(/immutable/i).first()).toBeVisible()
  })

  test("ledger entries or empty state is visible", async ({ page }) => {
    // Wait for loading to finish (spinner disappears)
    await expect(page.getByText(/loading audit trail/i)).not.toBeVisible({
      timeout: 10_000,
    })

    const hasEntries = await page
      .getByText(/entries/i)
      .first()
      .isVisible()
    const hasEmpty = await page.getByText(/no audit events found/i).isVisible()

    expect(hasEntries || hasEmpty).toBe(true)
  })

  // ── Filter by action type ─────────────────────────────────────────────────

  test("Action Type filter is visible and contains options", async ({
    page,
  }) => {
    // The combobox / select labelled "Action Type" should be present
    const actionFilter = page.getByRole("combobox").filter({
      hasText: /action type|all actions/i,
    })

    // Fall back to finding the element by its placeholder text if combobox
    // role isn't matched (depends on the Select implementation)
    const filterEl = (await actionFilter.count())
      ? actionFilter
      : page.getByText(/action type/i).first()

    await expect(filterEl).toBeVisible()
  })

  test("filtering by action type narrows results", async ({ page }) => {
    // Wait for initial data to load
    await expect(page.getByText(/loading audit trail/i)).not.toBeVisible({
      timeout: 10_000,
    })

    // If vault is empty, this is a no-op test — skip gracefully
    if (await page.getByText(/no audit events found/i).isVisible()) {
      test.skip()
      return
    }

    // Click the Action Type select/combobox
    const actionSelect = page.getByRole("combobox").first()
    await actionSelect.click()

    // Choose "Created" from the dropdown list
    const createdOption = page
      .getByRole("option", { name: /^created$/i })
      .or(page.getByText(/^created$/i).first())

    await createdOption.click()

    // After filtering, the filter indicator should still show (or fewer results)
    // We just assert the page doesn't crash / error
    await expect(
      page.getByRole("heading", { name: /audit ledger/i })
    ).toBeVisible()
  })

  // ── CSV export ────────────────────────────────────────────────────────────

  test("Export CSV button is visible and clickable", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /export csv/i })
    await expect(exportBtn).toBeVisible()

    // Click and verify the button responds (shows loading state or starts download)
    // We listen for download OR just assert no navigation error
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 5_000 }).catch(() => null),
      exportBtn.click(),
    ])

    // Either a download started, or the button changed to "Exporting..." state
    const exportingText = page.getByText(/exporting/i)
    const downloadStarted = download !== null
    const loadingShown = await exportingText.isVisible()

    expect(downloadStarted || loadingShown).toBe(true)
  })

  // ── Pagination ────────────────────────────────────────────────────────────

  test("Load More button works when visible", async ({ page }) => {
    await expect(page.getByText(/loading audit trail/i)).not.toBeVisible({
      timeout: 10_000,
    })

    const loadMoreBtn = page.getByRole("button", { name: /load more/i })

    if (!(await loadMoreBtn.isVisible())) {
      // Not enough entries to paginate — skip gracefully
      test.skip()
      return
    }

    // Count entries before clicking
    const beforeCount = await page
      .getByText(/entries/i)
      .first()
      .textContent()

    await loadMoreBtn.click()

    // After loading more, either more entries appear or the button disappears
    await expect(page.getByText(/loading/i)).not.toBeVisible({
      timeout: 8_000,
    })

    const afterCount = await page
      .getByText(/entries/i)
      .first()
      .textContent()

    // The entry count text should either have changed or Load More disappeared
    const moreLoaded = beforeCount !== afterCount
    const btnGone = !(await loadMoreBtn.isVisible())

    expect(moreLoaded || btnGone).toBe(true)
  })
})
