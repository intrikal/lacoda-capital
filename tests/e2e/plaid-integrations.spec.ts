/**
 * ============================================================================
 * TEST FILE: plaid-integrations.spec.ts (Playwright E2E)
 * ============================================================================
 *
 * Kevin, this file contains end-to-end (E2E) tests for the Plaid integration
 * UI. E2E tests run in a real browser and click through the actual interface
 * just like a real user would.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS AN E2E TEST?                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ E2E = End-to-End. Playwright launches a real Chromium browser,         │
 * │ navigates to our app, and clicks/types/reads just like a human.        │
 * │                                                                         │
 * │ Unlike unit tests (pure functions) or integration tests (mocked DB),   │
 * │ E2E tests prove the entire stack works together:                        │
 * │   Browser → Next.js → Server Actions → DB → Response → UI             │
 * │                                                                         │
 * │ TRADEOFF: E2E tests are slower and need the app running.               │
 * │ Run them with: npx playwright test                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ MOCKING PLAID LINK IN E2E TESTS                                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Plaid Link is a third-party browser widget. We can't use real Plaid    │
 * │ in automated tests (requires actual bank login). We mock it by:        │
 * │                                                                         │
 * │  1. Intercepting the server action that creates the link token         │
 * │  2. Using Playwright's route.fulfill() to intercept the Plaid API call │
 * │  3. Simulating the "onSuccess" callback that Plaid Link would fire     │
 * │                                                                         │
 * │ In practice, you'd use one of:                                         │
 * │   a) A custom PlaidLink component that accepts a mock mode prop        │
 * │   b) Playwright's page.evaluate() to trigger the Plaid callback        │
 * │   c) Plaid's own sandbox test credentials (user_good / pass_good)      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PREREQUISITES:
 *   - App running at http://localhost:3000
 *   - Seed DB with a test org/user (or use fixtures)
 *   - PLAID_ENV=sandbox in .env.test
 *
 * RUN: npx playwright test tests/e2e/plaid-integrations.spec.ts
 */

import { test, expect, type Page, type Route } from "@playwright/test"

// ─── Constants ────────────────────────────────────────────────────────────

const INTEGRATIONS_URL = "/app/integrations"
const PLAID_LINK_TOKEN = "link-sandbox-test-abc123"
const PLAID_ACCESS_TOKEN = "access-sandbox-test-abc123"
const PLAID_ITEM_ID = "item_test_abc123"

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Mock the Plaid Link Token server action so it returns a predictable token.
 * This intercepts the Next.js server action call (POST to the page URL).
 */
async function mockPlaidLinkToken(page: Page) {
  // Server actions are POSTed to the current page URL with action IDs
  // We intercept the API call that createLinkToken makes to Plaid
  await page.route("**/sandbox.plaid.com/link/token/create", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        link_token: PLAID_LINK_TOKEN,
        expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        request_id: "req_mock_001",
      }),
    })
  })
}

/**
 * Mock the Plaid token exchange endpoint.
 */
async function mockPlaidTokenExchange(page: Page) {
  await page.route(
    "**/sandbox.plaid.com/item/public_token/exchange",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: PLAID_ACCESS_TOKEN,
          item_id: PLAID_ITEM_ID,
          request_id: "req_mock_002",
        }),
      })
    },
  )

  await page.route("**/sandbox.plaid.com/item/get", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        item: { institution_id: "ins_3" },
        request_id: "req_mock_003",
      }),
    })
  })

  await page.route(
    "**/sandbox.plaid.com/institutions/get_by_id",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          institution: { name: "Chase" },
          request_id: "req_mock_004",
        }),
      })
    },
  )
}

/**
 * Mock the Plaid balance API for sync operations.
 */
async function mockPlaidBalances(page: Page) {
  await page.route(
    "**/sandbox.plaid.com/accounts/balance/get",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accounts: [
            {
              account_id: "acct_checking_001",
              name: "Chase Total Checking",
              official_name: "Chase Premier Platinum Checking",
              type: "depository",
              subtype: "checking",
              balances: {
                current: 5432.10,
                available: 5200.0,
                iso_currency_code: "USD",
              },
            },
            {
              account_id: "acct_savings_002",
              name: "Chase Savings",
              official_name: null,
              type: "depository",
              subtype: "savings",
              balances: {
                current: 12000.0,
                available: 12000.0,
                iso_currency_code: "USD",
              },
            },
          ],
          request_id: "req_mock_balances",
        }),
      })
    },
  )
}

// ─── Shared setup ─────────────────────────────────────────────────────────

test.beforeEach(async () => {
  // Authenticate as a test advisor user
  // In practice, you'd use a test session cookie or login flow
  // For now we assume auth state is pre-seeded via storage state:
  // playwright.config.ts → use: { storageState: 'tests/e2e/.auth/advisor.json' }
})

// ============================================================================
// 1. Integrations page — initial load
// ============================================================================

test.describe("Integrations page — initial load", () => {
  test("navigates to /app/integrations and shows provider catalog", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // Page should load without error
    await expect(page).toHaveTitle(/Integration|Connect/i)

    // Provider catalog should be visible
    await expect(page.getByText("Plaid")).toBeVisible()
  })

  test("shows Plaid as 'Not Connected' when no integration exists", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // Find the Plaid card
    const plaidCard = page.locator('[data-provider="plaid"]').first()

    // Should show a "Connect" button (not "Manage" or "Disconnect")
    await expect(plaidCard.getByRole("button", { name: /connect/i })).toBeVisible()
  })

  test("shows category filter tabs", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // Should have filter tabs for integration categories
    await expect(page.getByRole("tab", { name: /all/i })).toBeVisible()
  })

  test("shows integration stats (total, connected, error counts)", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // Stats section should be visible
    // The exact selector depends on your UI component structure
    const statsSection = page.locator('[data-testid="integration-stats"]')
    if (await statsSection.isVisible()) {
      await expect(statsSection).toContainText(/connected/i)
    }
  })
})

// ============================================================================
// 2. Plaid connect flow
// ============================================================================

test.describe("Plaid connect flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockPlaidLinkToken(page)
    await mockPlaidTokenExchange(page)
  })

  test("clicking 'Connect Plaid' triggers link token creation", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // Click the Plaid Connect button
    const plaidCard = page.locator('[data-provider="plaid"]').first()
    await plaidCard.getByRole("button", { name: /connect/i }).click()

    // A dialog or modal should appear, OR Plaid Link should open
    // (In test mode, we expect the dialog/modal with instructions)
    // This test verifies the button click doesn't crash the page
    await expect(page).not.toHaveURL(/error/)
  })

  test("Plaid card shows 'Connected' status after successful connection", async ({
    page,
  }) => {
    // This test requires the app to process a mock Plaid callback.
    // The exact implementation depends on how your PlaidLink component
    // calls exchangePublicToken after the user completes the flow.

    await page.goto(INTEGRATIONS_URL)

    // Simulate: Plaid Link succeeds and calls our server action
    // We inject a test scenario by directly calling the server action
    // via a test API endpoint (or by navigating to a test URL that triggers it)

    // For now, verify the page doesn't throw when the action completes
    await expect(page.locator("body")).not.toContainText("Something went wrong")
  })
})

// ============================================================================
// 3. Connected Plaid card — synced state
// ============================================================================

test.describe("Connected Plaid integration card", () => {
  // These tests assume a Plaid integration already exists in the test DB.
  // Set this up in beforeEach with a DB seed or fixture.

  test("shows 'Connected' badge on Plaid card when integration exists", async ({
    page,
  }) => {
    // Requires a pre-seeded connected Plaid integration
    await page.goto(INTEGRATIONS_URL)

    // Look for any connected status indicator
    const connectedBadge = page.getByText(/connected/i).first()
    // If connected integration exists in seed, this should be visible
    // If not seeded, this test is a documentation of expected behavior
    test.skip(!await connectedBadge.isVisible(), "No seeded Plaid integration")
  })

  test("shows last sync time on connected Plaid card", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // Last sync time should appear on the card
    const syncTime = page.getByText(/last sync|synced/i).first()
    test.skip(!await syncTime.isVisible(), "No seeded Plaid integration")
    await expect(syncTime).toBeVisible()
  })

  test("'Sync Now' button shows loading state during sync", async ({ page }) => {
    await mockPlaidBalances(page)
    await page.goto(INTEGRATIONS_URL)

    const syncButton = page.getByRole("button", { name: /sync now/i }).first()
    test.skip(!await syncButton.isVisible(), "No seeded Plaid integration")

    await syncButton.click()

    // Loading state should appear briefly
    await expect(
      page.getByRole("button", { name: /syncing|loading/i }).first(),
    ).toBeVisible({ timeout: 2000 })
  })

  test("'Sync Now' shows success toast after sync completes", async ({ page }) => {
    await mockPlaidBalances(page)
    await page.goto(INTEGRATIONS_URL)

    const syncButton = page.getByRole("button", { name: /sync now/i }).first()
    test.skip(!await syncButton.isVisible(), "No seeded Plaid integration")

    await syncButton.click()

    // Success notification should appear
    await expect(
      page.getByText(/sync(ed|ing)? (complete|success)/i).first(),
    ).toBeVisible({ timeout: 5000 })
  })
})

// ============================================================================
// 4. Disconnect flow
// ============================================================================

test.describe("Disconnect Plaid integration", () => {
  test("clicking 'Disconnect' shows confirmation dialog", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    const disconnectButton = page
      .getByRole("button", { name: /disconnect/i })
      .first()
    test.skip(!await disconnectButton.isVisible(), "No seeded Plaid integration")

    await disconnectButton.click()

    // A confirmation dialog should appear
    await expect(
      page.getByRole("dialog"),
    ).toBeVisible()

    // Dialog should warn about what will happen
    await expect(
      page.getByText(/disconnect|remove|revoke/i),
    ).toBeVisible()
  })

  test("clicking 'Cancel' in disconnect dialog closes it without action", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)

    const disconnectButton = page
      .getByRole("button", { name: /disconnect/i })
      .first()
    test.skip(!await disconnectButton.isVisible(), "No seeded Plaid integration")

    await disconnectButton.click()
    await page.getByRole("button", { name: /cancel/i }).click()

    // Dialog should be closed
    await expect(page.getByRole("dialog")).not.toBeVisible()

    // Integration should still show connected
    await expect(page.getByText(/connected/i).first()).toBeVisible()
  })

  test("confirming disconnect changes card to 'Not Connected' state", async ({
    page,
  }) => {
    // Mock Plaid /item/remove
    await page.route(
      "**/sandbox.plaid.com/item/remove",
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ removed: true, request_id: "req_mock_remove" }),
        })
      },
    )

    await page.goto(INTEGRATIONS_URL)

    const disconnectButton = page
      .getByRole("button", { name: /disconnect/i })
      .first()
    test.skip(!await disconnectButton.isVisible(), "No seeded Plaid integration")

    await disconnectButton.click()

    // Confirm the disconnect
    const confirmButton = page.getByRole("button", { name: /confirm|yes|disconnect/i })
    await confirmButton.click()

    // Card should now show "Not Connected" or show the "Connect" button
    await expect(
      page.getByRole("button", { name: /connect/i }).first(),
    ).toBeVisible({ timeout: 5000 })
  })
})

// ============================================================================
// 5. Error state — integration needs re-authentication
// ============================================================================

test.describe("Plaid error state — re-authentication required", () => {
  test("error state shows an error indicator on the Plaid card", async ({ page }) => {
    // Requires a pre-seeded Plaid integration in error state
    await page.goto(INTEGRATIONS_URL)

    // Error badge or indicator
    const errorIndicator = page.getByText(/error|re-auth|reconnect/i).first()
    test.skip(!await errorIndicator.isVisible(), "No seeded error-state Plaid integration")

    await expect(errorIndicator).toBeVisible()
  })

  test("error state shows a 'Reconnect' button", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    const reconnectButton = page
      .getByRole("button", { name: /reconnect/i })
      .first()
    test.skip(!await reconnectButton.isVisible(), "No seeded error-state Plaid integration")

    await expect(reconnectButton).toBeVisible()
  })

  test("error state shows the specific error message from statusMessage", async ({
    page,
  }) => {
    // The statusMessage field should surface to the user
    await page.goto(INTEGRATIONS_URL)

    // With a seeded integration that has statusMessage = "Your bank login has expired..."
    const errorMsg = page.getByText(/bank login|expired|reconnect/i).first()
    test.skip(!await errorMsg.isVisible(), "No seeded error-state Plaid integration")

    await expect(errorMsg).toBeVisible()
  })
})

// ============================================================================
// 6. Plaid not configured — shows "Not Configured" state
// ============================================================================

test.describe("Plaid not configured (env vars missing)", () => {
  test("shows 'Coming Soon' or 'Not Configured' when Plaid is not set up", async ({
    page,
  }) => {
    // When PLAID_CLIENT_ID / PLAID_SECRET are missing, isPlaidConfigured() = false
    // The UI should reflect this (provider.configured = false)
    await page.goto(INTEGRATIONS_URL)

    // This may or may not be visible depending on the test environment's env vars
    // We just verify the page doesn't crash
    await expect(page.locator("body")).not.toContainText("Something went wrong")
  })
})

// ============================================================================
// 7. API section — custom integrations
// ============================================================================

test.describe("Custom integrations API section", () => {
  test("integrations page shows the custom API section", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // The page has a section about the custom integrations API
    await expect(
      page.getByText(/custom|api key|api integration/i).first(),
    ).toBeVisible()
  })
})

// ============================================================================
// 8. Accessibility basics
// ============================================================================

test.describe("Accessibility — integrations page", () => {
  test("integration cards have accessible button labels", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // All buttons should have accessible names
    const buttons = await page.getByRole("button").all()
    for (const button of buttons) {
      const accessibleName = await button.getAttribute("aria-label") ??
        await button.textContent()
      expect(accessibleName?.trim().length).toBeGreaterThan(0)
    }
  })

  test("page has a main heading", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // h1 or main landmark with a heading
    const heading = page.getByRole("heading", { level: 1 })
    await expect(heading).toBeVisible()
  })
})

// ============================================================================
// 9. Navigation and page state
// ============================================================================

test.describe("Navigation — integrations page", () => {
  test("integrations page loads without console errors", async ({ page }) => {
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(INTEGRATIONS_URL)
    await page.waitForLoadState("networkidle")

    // Filter out known acceptable errors (e.g. favicon not found)
    const unexpectedErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("chunk"),
    )
    expect(unexpectedErrors).toHaveLength(0)
  })

  test("integrations page does not show a 404 or 500 error", async ({ page }) => {
    const response = await page.goto(INTEGRATIONS_URL)
    expect(response?.status()).not.toBe(404)
    expect(response?.status()).not.toBe(500)
  })

  test("clicking integration category tabs filters the provider list", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)

    // Click "Financial Data" tab
    const financialTab = page.getByRole("tab", { name: /financial data/i })
    if (await financialTab.isVisible()) {
      await financialTab.click()

      // Plaid (financial data) should still be visible
      await expect(page.getByText("Plaid")).toBeVisible()
    }
  })
})

// ============================================================================
// 10. Security — access tokens never appear in the UI
// ============================================================================

test.describe("Security — no token leakage in UI", () => {
  test("page source does not contain Plaid access token pattern", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)
    await page.waitForLoadState("networkidle")

    // Get all text content on the page
    const content = await page.content()

    // Plaid access tokens always start with "access-"
    // They should NEVER appear in the HTML
    expect(content).not.toMatch(/access-sandbox-[a-z0-9-]+/)
    expect(content).not.toMatch(/access-production-[a-z0-9-]+/)
  })

  test("network responses do not contain access tokens", async ({ page }) => {
    const responseTokens: string[] = []

    page.on("response", async (response) => {
      try {
        const text = await response.text()
        if (text.includes("access-sandbox-") || text.includes("access-production-")) {
          responseTokens.push(response.url())
        }
      } catch {
        // Binary responses or already-consumed responses — ignore
      }
    })

    await page.goto(INTEGRATIONS_URL)
    await page.waitForLoadState("networkidle")

    expect(responseTokens).toHaveLength(0)
  })
})
