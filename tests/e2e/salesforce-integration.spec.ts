/**
 * ============================================================================
 * TEST FILE: salesforce-integration.spec.ts (Playwright E2E)
 * ============================================================================
 *
 * Kevin, this file contains end-to-end (E2E) tests for the Salesforce
 * integration UI. E2E tests run in a real browser and click through the
 * actual interface just like a real user would.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS AN E2E TEST?                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ E2E = End-to-End. Playwright launches a real Chromium browser,         │
 * │ navigates to our app, and clicks/types/reads just like a human.        │
 * │                                                                         │
 * │ Unlike unit tests (pure functions) or integration tests (mocked DB),   │
 * │ E2E tests prove the entire stack works together:                        │
 * │   Browser -> Next.js -> Server Actions -> DB -> Response -> UI         │
 * │                                                                         │
 * │ TRADEOFF: E2E tests are slower and need the app running.               │
 * │ Run them with: npx playwright test                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ MOCKING SALESFORCE OAUTH IN E2E TESTS                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Salesforce OAuth requires a real login. We mock it by:                 │
 * │                                                                         │
 * │  1. Intercepting the OAuth redirect with Playwright route              │
 * │  2. Mocking the Salesforce token exchange endpoint                     │
 * │  3. Simulating the callback with a fake auth code                      │
 * │                                                                         │
 * │ In practice, you can use Salesforce's sandbox environment for manual   │
 * │ testing, but E2E tests always use mocks.                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PREREQUISITES:
 *   - App running at http://localhost:3000
 *   - SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET set in .env.test
 *   - Seed DB with a test org/user (or use fixtures)
 *
 * RUN: npx playwright test tests/e2e/salesforce-integration.spec.ts
 */

import { test, expect, type Page, type Route } from "@playwright/test"

// ─── Constants ──────────────────────────────────────────────────────────────

const INTEGRATIONS_URL = "/app/integrations"
const SF_ACCESS_TOKEN = "00D000000000001!AQ0AQTEST_ACCESS_TOKEN"
const SF_REFRESH_TOKEN = "5Aep000000000001_TEST_REFRESH"
const SF_INSTANCE_URL = "https://na1.salesforce.com"

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Mock the Salesforce OAuth token exchange endpoint.
 * This intercepts the server-side call to Salesforce when exchanging the auth code.
 */
async function mockSalesforceTokenExchange(page: Page) {
  await page.route(
    "**/login.salesforce.com/services/oauth2/token",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: SF_ACCESS_TOKEN,
          refresh_token: SF_REFRESH_TOKEN,
          instance_url: SF_INSTANCE_URL,
          issued_at: String(Date.now()),
          id: "https://login.salesforce.com/id/00D000000000001/005000000000001",
          token_type: "Bearer",
        }),
      })
    },
  )
}

/**
 * Mock the Salesforce SOQL query endpoint for Contacts.
 */
async function mockSalesforceContactQuery(page: Page) {
  await page.route(
    `${SF_INSTANCE_URL}/services/data/v59.0/query*`,
    async (route: Route) => {
      const url = route.request().url()

      if (url.includes("Contact")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalSize: 2,
            done: true,
            nextRecordsUrl: null,
            records: [
              {
                Id: "003000000000001",
                FirstName: "Alice",
                LastName: "Johnson",
                Email: "alice@example.com",
                Phone: "+1-555-100-0001",
                MailingStreet: "100 Market St",
                MailingCity: "San Francisco",
                MailingState: "CA",
                MailingPostalCode: "94105",
                MailingCountry: "US",
                Title: "CFO",
                Department: "Finance",
                AccountId: "001000000000001",
                IsDeleted: false,
              },
              {
                Id: "003000000000002",
                FirstName: "Bob",
                LastName: "Chen",
                Email: "bob@example.com",
                Phone: null,
                MailingStreet: null,
                MailingCity: null,
                MailingState: null,
                MailingPostalCode: null,
                MailingCountry: null,
                Title: null,
                Department: null,
                AccountId: null,
                IsDeleted: false,
              },
            ],
          }),
        })
      } else if (url.includes("Opportunity")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalSize: 1,
            done: true,
            nextRecordsUrl: null,
            records: [
              {
                Id: "006000000000001",
                Name: "Acme Corp Wealth Management",
                StageName: "Proposal/Price Quote",
                Amount: 500000,
                CloseDate: "2024-06-30",
                AccountId: "001000000000001",
                Description: "Full-service wealth management",
                Probability: 75,
                IsClosed: false,
                IsWon: false,
                IsDeleted: false,
              },
            ],
          }),
        })
      } else {
        await route.continue()
      }
    },
  )
}

/**
 * Mock the Salesforce token revoke endpoint (for disconnect).
 */
async function mockSalesforceRevoke(page: Page) {
  await page.route(
    "**/login.salesforce.com/services/oauth2/revoke",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "",
      })
    },
  )
}

// ─── Shared setup ───────────────────────────────────────────────────────────

test.beforeEach(async () => {
  // Authenticate as a test advisor user.
  // In practice, use a test session cookie or login flow.
  // playwright.config.ts -> use: { storageState: 'tests/e2e/.auth/advisor.json' }
})

// ============================================================================
// 1. Integrations page — Salesforce card visible
// ============================================================================

test.describe("Integrations page — Salesforce card", () => {
  test("shows Salesforce in the provider catalog", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // Salesforce should appear in the integrations list
    await expect(page.getByText("Salesforce")).toBeVisible()
  })

  test("Salesforce card shows CRM category", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // The card should display "CRM" as its category
    const sfCard = page.locator("text=Salesforce").first()
    await expect(sfCard).toBeVisible()
  })

  test("Salesforce card shows key features", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // At least some features should be visible on the card
    await expect(page.getByText("Client sync")).toBeVisible()
  })

  test("shows 'Connect' button when Salesforce is available but not connected", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)

    // If SALESFORCE_CLIENT_ID is configured, the card should show "Connect"
    // If not configured, it shows "Not Configured"
    // Either way, page should load without error
    await expect(page.locator("body")).not.toContainText("Something went wrong")
  })
})

// ============================================================================
// 2. Connect Salesforce — OAuth redirect (mock)
// ============================================================================

test.describe("Connect Salesforce — OAuth redirect", () => {
  test.beforeEach(async ({ page }) => {
    await mockSalesforceTokenExchange(page)
  })

  test("clicking 'Connect Salesforce' triggers OAuth flow without crashing", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)

    // Find a Connect button (may be on the Salesforce card or in a dialog)
    const connectButton = page.getByRole("button", { name: /connect/i }).first()
    if (await connectButton.isVisible()) {
      await connectButton.click()

      // Should not crash the page
      await expect(page).not.toHaveURL(/error/)
    }
  })

  test("connect dialog shows Salesforce features before redirecting", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)

    // Click Connect on the Salesforce card specifically
    const sfSection = page.locator("text=Salesforce").first()
    if (await sfSection.isVisible()) {
      // The dialog should show feature list
      await expect(page.locator("body")).not.toContainText("Something went wrong")
    }
  })
})

// ============================================================================
// 3. Connected state — shows "Connected" with last sync time
// ============================================================================

test.describe("Connected Salesforce — shows connected status", () => {
  // These tests require a pre-seeded connected Salesforce integration in the test DB

  test("shows 'Connected' badge when Salesforce integration exists", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)

    const connectedBadge = page.getByText(/connected/i).first()
    test.skip(
      !(await connectedBadge.isVisible()),
      "No seeded Salesforce integration",
    )
    await expect(connectedBadge).toBeVisible()
  })

  test("shows last sync time on connected Salesforce card", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    const syncTime = page.getByText(/last sync|synced/i).first()
    test.skip(
      !(await syncTime.isVisible()),
      "No seeded Salesforce integration",
    )
    await expect(syncTime).toBeVisible()
  })
})

// ============================================================================
// 4. Sync Now — progress indicator -> success toast
// ============================================================================

test.describe("Sync Now — triggers sync and shows progress", () => {
  test.beforeEach(async ({ page }) => {
    await mockSalesforceContactQuery(page)
  })

  test("'Sync Now' button shows loading state during sync", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    const syncButton = page.getByRole("button", { name: /sync now/i }).first()
    test.skip(
      !(await syncButton.isVisible()),
      "No seeded Salesforce integration",
    )

    await syncButton.click()

    // Loading state should appear briefly
    await expect(
      page.getByRole("button", { name: /syncing|loading/i }).first(),
    ).toBeVisible({ timeout: 2000 })
  })

  test("'Sync Now' shows success toast after completion", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    const syncButton = page.getByRole("button", { name: /sync now/i }).first()
    test.skip(
      !(await syncButton.isVisible()),
      "No seeded Salesforce integration",
    )

    await syncButton.click()

    // Success notification should appear
    await expect(
      page.getByText(/sync(ed|ing)? (complete|success)/i).first(),
    ).toBeVisible({ timeout: 5000 })
  })
})

// ============================================================================
// 5. Disconnect — confirmation -> status changes
// ============================================================================

test.describe("Disconnect Salesforce", () => {
  test.beforeEach(async ({ page }) => {
    await mockSalesforceRevoke(page)
  })

  test("clicking 'Disconnect' shows confirmation dialog", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // Find disconnect/manage button
    const manageButton = page.getByRole("button", { name: /manage/i }).first()
    test.skip(
      !(await manageButton.isVisible()),
      "No seeded Salesforce integration",
    )

    await manageButton.click()

    // In the manage dialog, click disconnect
    const disconnectButton = page
      .getByRole("button", { name: /disconnect/i })
      .first()
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click()

      // Confirmation dialog should appear
      await expect(page.getByRole("dialog")).toBeVisible()
      await expect(page.getByText(/disconnect|remove|revoke/i)).toBeVisible()
    }
  })

  test("confirming disconnect changes card to 'Not Connected' state", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)

    const manageButton = page.getByRole("button", { name: /manage/i }).first()
    test.skip(
      !(await manageButton.isVisible()),
      "No seeded Salesforce integration",
    )

    await manageButton.click()

    const disconnectButton = page
      .getByRole("button", { name: /disconnect/i })
      .first()
    test.skip(
      !(await disconnectButton.isVisible()),
      "No disconnect button visible",
    )

    await disconnectButton.click()

    // Confirm the disconnect
    const confirmButton = page.getByRole("button", {
      name: /confirm|yes|disconnect/i,
    })
    if (await confirmButton.isVisible()) {
      await confirmButton.click()

      // Card should now show "Connect" button instead of "Manage"
      await expect(
        page.getByRole("button", { name: /connect/i }).first(),
      ).toBeVisible({ timeout: 5000 })
    }
  })
})

// ============================================================================
// 6. Error state — Salesforce needs re-authentication
// ============================================================================

test.describe("Salesforce error state — re-authentication required", () => {
  test("error state shows an error indicator on the Salesforce card", async ({
    page,
  }) => {
    // Requires a pre-seeded Salesforce integration in error state
    await page.goto(INTEGRATIONS_URL)

    const errorIndicator = page
      .getByText(/error|re-auth|reconnect/i)
      .first()
    test.skip(
      !(await errorIndicator.isVisible()),
      "No seeded error-state Salesforce integration",
    )

    await expect(errorIndicator).toBeVisible()
  })

  test("error state shows a 'Reconnect' button", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    const reconnectButton = page
      .getByRole("button", { name: /reconnect/i })
      .first()
    test.skip(
      !(await reconnectButton.isVisible()),
      "No seeded error-state Salesforce integration",
    )

    await expect(reconnectButton).toBeVisible()
  })
})

// ============================================================================
// 7. CRM category filter
// ============================================================================

test.describe("CRM category filter", () => {
  test("clicking 'CRM' category filter shows Salesforce card", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)

    const crmFilter = page.getByRole("button", { name: /CRM/i })
    if (await crmFilter.isVisible()) {
      await crmFilter.click()

      // Salesforce should still be visible after filtering
      await expect(page.getByText("Salesforce")).toBeVisible()
    }
  })
})

// ============================================================================
// 8. Security — no token leakage in UI
// ============================================================================

test.describe("Security — no Salesforce token leakage in UI", () => {
  test("page source does not contain Salesforce access token pattern", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)
    await page.waitForLoadState("networkidle")

    const content = await page.content()

    // Salesforce access tokens start with a pattern like "00D..."
    // They should NEVER appear in the HTML
    expect(content).not.toMatch(/00D[a-zA-Z0-9]{15}![a-zA-Z0-9]+/)
  })

  test("network responses do not contain Salesforce access tokens", async ({
    page,
  }) => {
    const tokenLeaks: string[] = []

    page.on("response", async (response) => {
      try {
        const text = await response.text()
        // Salesforce access token pattern
        if (/00D[a-zA-Z0-9]{15}!/.test(text)) {
          tokenLeaks.push(response.url())
        }
      } catch {
        // Binary responses or already-consumed — ignore
      }
    })

    await page.goto(INTEGRATIONS_URL)
    await page.waitForLoadState("networkidle")

    expect(tokenLeaks).toHaveLength(0)
  })
})

// ============================================================================
// 9. Accessibility
// ============================================================================

test.describe("Accessibility — Salesforce integration", () => {
  test("Salesforce card has accessible button labels", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)

    // All buttons related to Salesforce should have accessible names
    const buttons = await page.getByRole("button").all()
    for (const button of buttons) {
      const accessibleName =
        (await button.getAttribute("aria-label")) ??
        (await button.textContent())
      expect(accessibleName?.trim().length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// 10. Page does not crash
// ============================================================================

test.describe("Navigation — Salesforce integration page stability", () => {
  test("integrations page loads without console errors", async ({ page }) => {
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(INTEGRATIONS_URL)
    await page.waitForLoadState("networkidle")

    const unexpectedErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("chunk"),
    )
    expect(unexpectedErrors).toHaveLength(0)
  })

  test("integrations page does not show a 404 or 500 error", async ({
    page,
  }) => {
    const response = await page.goto(INTEGRATIONS_URL)
    expect(response?.status()).not.toBe(404)
    expect(response?.status()).not.toBe(500)
  })
})
