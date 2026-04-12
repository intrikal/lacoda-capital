/**
 * ============================================================================
 * E2E TEST FILE: dashboard-overview.spec.ts
 * ============================================================================
 *
 * Tests for the main dashboard page at /app.
 *
 * BEFORE RUNNING:
 *   Make sure your dev server is running:  npm run dev
 *   Run with:  npx playwright test tests/e2e/dashboard-overview.spec.ts
 *
 * CREDENTIALS:
 *   These tests rely on an already-authenticated browser session.
 *   If the middleware redirects to /login (no active session), the tests
 *   are automatically skipped.
 *
 *   To run them locally, either log in at http://localhost:3000 first
 *   (same browser profile) or set TEST_USER_EMAIL / TEST_USER_PASSWORD
 *   in .env.local and use the auth fixture pattern from auth.spec.ts.
 */

import { test, expect } from "@playwright/test"

test.describe("Dashboard overview page (/app)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app")
    // Skip entire suite if we get redirected to the login page
    if (page.url().includes("/login")) {
      test.skip()
    }
  })

  // ── KPI cards ─────────────────────────────────────────────────────────────

  test("KPI cards are visible", async ({ page }) => {
    // The "Key Metrics" heading sits above the four KPI cards
    await expect(
      page.getByRole("heading", { name: /key metrics/i })
    ).toBeVisible()

    // Each card label should be visible on the page
    await expect(
      page.getByText(/assets under management/i).first()
    ).toBeVisible()
    await expect(page.getByText(/active clients/i).first()).toBeVisible()
  })

  // ── Allocation / performance chart ────────────────────────────────────────

  test("Performance analytics section renders", async ({ page }) => {
    // The dashboard renders a "Performance Analytics" heading and chart area
    await expect(
      page.getByRole("heading", { name: /performance analytics/i })
    ).toBeVisible()
  })

  // ── Activity feed ─────────────────────────────────────────────────────────

  test("Portfolio summary hero card is visible", async ({ page }) => {
    // The hero card shows total AUM and YTD return prominently
    await expect(
      page.getByText(/total assets under management/i).first()
    ).toBeVisible()
  })

  // ── Quick actions ─────────────────────────────────────────────────────────

  test("Quick action buttons are visible in the header", async ({ page }) => {
    // Two primary quick-action buttons live in the welcome header
    await expect(page.getByRole("button", { name: /alerts/i })).toBeVisible()
    await expect(
      page.getByRole("button", { name: /quick transfer/i })
    ).toBeVisible()
  })

  // ── Sidebar navigation to /app/clients ────────────────────────────────────

  test("clicking Clients in the sidebar navigates to /app/clients", async ({
    page,
  }) => {
    // The sidebar has a nav link labelled "Clients"
    await page.getByRole("link", { name: /^clients$/i }).click()

    await expect(page).toHaveURL(/\/app\/clients/, { timeout: 8_000 })
    await expect(
      page.getByRole("heading", { name: /clients/i })
    ).toBeVisible()
  })
})
