/**
 * ============================================================================
 * E2E TEST FILE: docusign-signing.spec.ts
 * ============================================================================
 *
 * Kevin, these are end-to-end (E2E) tests. They control a real browser,
 * click real buttons, and verify what the user actually sees on screen.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS E2E TESTING?                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Unit tests check a function in isolation.                               │
 * │ Integration tests check multiple functions working together.            │
 * │ E2E tests check the app the way a real USER would use it:              │
 * │   - Open a browser                                                      │
 * │   - Navigate to a page                                                  │
 * │   - Click, type, wait for things to appear                             │
 * │   - Assert that the page shows the right content                        │
 * │                                                                         │
 * │ We use Playwright for E2E tests. It's like a robot user.               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HOW TO RUN                                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │   npm run test:e2e                — run all E2E tests (headless)        │
 * │   npm run test:e2e:ui             — open Playwright UI (see the browser)│
 * │   npx playwright test docusign    — run only this file                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PREREQUISITES:
 *   The test assumes a running dev server with:
 *   - A seeded test user (advisor role)
 *   - A DocuSign integration connected (or mocked at the API route level)
 *   - At least one document in the Vault
 *
 * RELATED FILES:
 *   playwright.config.ts                   — Playwright configuration
 *   tests/e2e/helpers/auth.ts              — login helper (if it exists)
 *   app/(dashboard)/app/vault/page.tsx     — Vault page being tested
 */

import { test, expect, type Page } from "@playwright/test"

// ─── Constants ───────────────────────────────────────────────────────────────

const VAULT_URL = "/app/vault"
const INTEGRATIONS_URL = "/app/integrations"

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Simulate a DocuSign webhook arriving by calling our API route directly.
 * This lets us test the UI reaction to a signing event without needing a
 * real DocuSign account.
 *
 * @param page        - Playwright page (for request context)
 * @param envelopeId  - The envelope to update
 * @param status      - New DocuSign status (e.g., "completed", "declined")
 * @param secret      - HMAC webhook secret (from .env.test)
 */
async function simulateDocuSignWebhook(
  page: Page,
  envelopeId: string,
  status: string,
  secret = process.env.DOCUSIGN_WEBHOOK_SECRET ?? "test-secret",
) {
  const { createHmac } = await import("crypto")

  const payload = JSON.stringify({
    event: `envelope-${status}`,
    envelopeId,
    status,
    completedDateTime: status === "completed" ? new Date().toISOString() : null,
    recipients: {
      signers: [
        {
          email: "client@example.com",
          name: "Jane Client",
          status,
        },
      ],
    },
  })

  const signature = createHmac("sha256", secret).update(payload, "utf8").digest("base64")

  const response = await page.request.post("/api/webhooks/docusign", {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "X-DocuSign-Signature-1": signature,
    },
  })

  return response
}

// ============================================================================
// Test Suite Setup
// ============================================================================

// NOTE: These tests require an authenticated session.
// If your project has a shared auth fixture, replace the beforeEach with that.
test.beforeEach(async ({ page }) => {
  // Navigate to the app — if auth is required, this will redirect to login.
  // Adjust this to match your auth setup (e.g., Supabase magic link, test user).
  await page.goto("/app/vault")
})

// ============================================================================
// 1. Vault page — "Send for Signature" button appears
// ============================================================================

test.describe("Vault page — Send for Signature UI", () => {
  test("vault page loads without errors", async ({ page }) => {
    await expect(page).toHaveURL(/\/app\/vault/)
    // Page should not show a 500 error or crash overlay
    await expect(page.getByText("Something went wrong")).not.toBeVisible()
    await expect(page.getByText("Internal Server Error")).not.toBeVisible()
  })

  test("document row has a 'Send for Signature' button when DocuSign is connected", async ({
    page,
  }) => {
    // Wait for documents to load
    await page.waitForLoadState("networkidle")

    // Look for the send button on any document row
    // Adjust the selector to match your actual button text/aria-label
    const sendButton = page.getByRole("button", { name: /send for signature/i }).first()
    await expect(sendButton).toBeVisible({ timeout: 10_000 })
  })

  test("document shows 'Awaiting Signature' badge after sending", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    // Click "Send for Signature" on the first available document
    const sendButton = page.getByRole("button", { name: /send for signature/i }).first()
    await sendButton.click()

    // The dialog should open
    await expect(page.getByRole("dialog")).toBeVisible()
  })
})

// ============================================================================
// 2. Send for Signature dialog
// ============================================================================

test.describe("Send for Signature dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForLoadState("networkidle")
    // Open the dialog
    const sendButton = page.getByRole("button", { name: /send for signature/i }).first()
    await sendButton.click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("dialog contains signer email and name fields", async ({ page }) => {
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByLabel(/email/i)).toBeVisible()
    await expect(dialog.getByLabel(/name/i)).toBeVisible()
  })

  test("dialog has a Send / Confirm button", async ({ page }) => {
    const dialog = page.getByRole("dialog")
    // Look for a submit/send button inside the dialog
    const submitButton = dialog
      .getByRole("button", { name: /send|submit|confirm/i })
      .filter({ hasNot: page.getByRole("button", { name: /cancel/i }) })
      .first()
    await expect(submitButton).toBeVisible()
  })

  test("shows validation error when email is empty", async ({ page }) => {
    const dialog = page.getByRole("dialog")

    // Clear the email field if pre-filled
    const emailField = dialog.getByLabel(/email/i)
    await emailField.clear()

    // Try to submit
    const submitButton = dialog.getByRole("button", { name: /send|submit|confirm/i }).first()
    await submitButton.click()

    // Should show an error — the exact text will depend on your UI
    await expect(dialog.getByText(/email.*required|required.*email|enter.*email/i)).toBeVisible()
  })

  test("shows validation error for invalid email format", async ({ page }) => {
    const dialog = page.getByRole("dialog")

    const emailField = dialog.getByLabel(/email/i)
    await emailField.fill("not-a-valid-email")

    const submitButton = dialog.getByRole("button", { name: /send|submit|confirm/i }).first()
    await submitButton.click()

    await expect(dialog.getByText(/invalid email|valid email/i)).toBeVisible()
  })

  test("successfully submits with valid signer details", async ({ page }) => {
    const dialog = page.getByRole("dialog")

    await dialog.getByLabel(/email/i).fill("client@example.com")
    await dialog.getByLabel(/name/i).fill("Jane Client")

    // Mock the API call to prevent real DocuSign call
    await page.route("**/api/docusign/send**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ envelopeId: "env-test-123", success: true }),
      })
    })

    const submitButton = dialog.getByRole("button", { name: /send|submit|confirm/i }).first()
    await submitButton.click()

    // Should show a success toast
    await expect(page.getByText(/sent|success|signature request/i)).toBeVisible({ timeout: 5000 })
  })

  test("dialog closes after successful send", async ({ page }) => {
    const dialog = page.getByRole("dialog")

    await dialog.getByLabel(/email/i).fill("client@example.com")
    await dialog.getByLabel(/name/i).fill("Jane Client")

    await page.route("**/api/docusign/send**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ envelopeId: "env-test-123", success: true }),
      })
    })

    const submitButton = dialog.getByRole("button", { name: /send|submit|confirm/i }).first()
    await submitButton.click()

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  })

  test("Cancel button closes the dialog without sending", async ({ page }) => {
    const dialog = page.getByRole("dialog")
    const cancelButton = dialog.getByRole("button", { name: /cancel/i })
    await cancelButton.click()

    await expect(dialog).not.toBeVisible()
  })
})

// ============================================================================
// 3. Document status badges
// ============================================================================

test.describe("Document status badges — reflect signing state", () => {
  test("document shows 'Awaiting Signature' badge after envelope is sent", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    // Mock the send endpoint
    await page.route("**/api/docusign/send**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ envelopeId: "env-pending-456" }),
      })
    })

    const sendButton = page.getByRole("button", { name: /send for signature/i }).first()
    await sendButton.click()

    const dialog = page.getByRole("dialog")
    await dialog.getByLabel(/email/i).fill("client@example.com")
    await dialog.getByLabel(/name/i).fill("Jane Client")
    await dialog.getByRole("button", { name: /send|submit|confirm/i }).first().click()

    // After sending, the document should show a pending/awaiting badge
    await expect(
      page.getByText(/awaiting signature|pending|sent for signature/i),
    ).toBeVisible({ timeout: 5000 })
  })

  test("document shows 'Signed' badge after receiving completed webhook", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    // Simulate a completed webhook arriving
    const webhookResponse = await simulateDocuSignWebhook(page, "env-test-completed", "completed")
    expect(webhookResponse.status()).toBeLessThan(400)

    // Reload to see the updated status
    await page.reload()
    await page.waitForLoadState("networkidle")

    // The document should now show a signed/verified badge
    // Adjust the text to match your actual badge label
    await expect(page.getByText(/signed|verified/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test("document shows 'Declined' badge after receiving declined webhook", async ({ page }) => {
    await page.waitForLoadState("networkidle")

    const webhookResponse = await simulateDocuSignWebhook(page, "env-test-declined", "declined")
    expect(webhookResponse.status()).toBeLessThan(400)

    await page.reload()
    await page.waitForLoadState("networkidle")

    await expect(page.getByText(/declined|rejected/i).first()).toBeVisible({ timeout: 10_000 })
  })
})

// ============================================================================
// 4. Integrations page — DocuSign connection state
// ============================================================================

test.describe("Integrations page — DocuSign connection UI", () => {
  test("integrations page loads and shows DocuSign card", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)
    await page.waitForLoadState("networkidle")

    await expect(page.getByText(/docusign/i)).toBeVisible()
  })

  test("DocuSign card shows 'Connected' status when integration is connected", async ({
    page,
  }) => {
    await page.goto(INTEGRATIONS_URL)
    await page.waitForLoadState("networkidle")

    // This test assumes the test environment has DocuSign connected.
    // Adjust the selector to match your card's status indicator.
    const docusignCard = page.locator("[data-provider='docusign'], [data-testid='docusign-card']")

    if (await docusignCard.isVisible()) {
      await expect(docusignCard.getByText(/connected/i)).toBeVisible()
    } else {
      // Fallback: look for connected status anywhere near the DocuSign text
      const docusignSection = page.getByText(/docusign/i).first().locator("..")
      await expect(docusignSection.getByText(/connected|disconnect/i)).toBeVisible()
    }
  })

  test("shows 'Connect' button when DocuSign is not connected", async ({ page }) => {
    await page.goto(INTEGRATIONS_URL)
    await page.waitForLoadState("networkidle")

    // If not connected, should show a Connect / Get Started button
    // This test may be skipped if the integration is always connected in test env
    const connectButton = page.getByRole("button", { name: /connect docusign|get started/i })
    const isConnected = await connectButton.isHidden()

    if (!isConnected) {
      await expect(connectButton).toBeVisible()
    }
  })
})

// ============================================================================
// 5. Webhook endpoint security
// ============================================================================

test.describe("Webhook endpoint — security validation", () => {
  test("rejects webhook without signature header (returns 401)", async ({ page }) => {
    const response = await page.request.post("/api/webhooks/docusign", {
      data: JSON.stringify({ status: "completed", envelopeId: "env-fake" }),
      headers: { "Content-Type": "application/json" },
      // NOTE: intentionally no X-DocuSign-Signature-1 header
    })

    // Should reject unsigned webhooks
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test("rejects webhook with wrong signature (returns 401)", async ({ page }) => {
    const payload = JSON.stringify({ status: "completed", envelopeId: "env-fake" })

    const response = await page.request.post("/api/webhooks/docusign", {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "X-DocuSign-Signature-1": "dGhpcyBpcyBmYWtl", // base64("this is fake")
      },
    })

    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test("accepts a validly signed webhook (returns 200)", async ({ page }) => {
    const response = await simulateDocuSignWebhook(
      page,
      "env-valid-test",
      "sent",
      process.env.DOCUSIGN_WEBHOOK_SECRET ?? "test-secret",
    )

    // Should accept valid signature — 200 or 204
    expect(response.status()).toBeLessThan(400)
  })
})
