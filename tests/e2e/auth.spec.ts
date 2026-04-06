/**
 * ============================================================================
 * E2E TEST FILE: auth.spec.ts
 * ============================================================================
 *
 * Kevin, these are END-TO-END (E2E) tests. Unlike unit tests that test
 * one function in isolation, E2E tests run a real browser against a real
 * Next.js server.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS AN E2E TEST?                                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Playwright opens a real Chrome browser and clicks around your app      │
 * │ exactly like a real user would. This catches bugs that unit tests      │
 * │ miss — like a button that's hidden, a redirect that goes to the wrong  │
 * │ URL, or a cookie that isn't being sent correctly.                      │
 * │                                                                         │
 * │ BEFORE RUNNING: make sure your dev server is running on port 3000.    │
 * │   npm run dev                                                           │
 * │                                                                         │
 * │ RUN WITH:                                                              │
 * │   npx playwright test tests/e2e/auth.spec.ts                          │
 * │   npx playwright test tests/e2e/auth.spec.ts --ui   ← visual mode     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHAT DOES THIS FILE TEST?
 *   1. Unauthenticated visit to /app  → redirected to /login
 *   2. /login page renders correctly
 *   3. Login with valid credentials   → redirected to /app
 *   4. Login preserves the `?next` redirect parameter
 *   5. Visiting /login while already logged in → redirected to /app
 *
 * NOTE ON CREDENTIALS:
 *   Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.local.
 *   These should be a dedicated test account in your Supabase project,
 *   NOT a real user's account.
 *
 *   TEST_USER_EMAIL=testuser@lacoda-test.com
 *   TEST_USER_PASSWORD=TestPassword123!
 */

import { test, expect } from "@playwright/test"

// ─── Helper: log in programmatically ─────────────────────────────────────────

/**
 * loginViaForm()
 *
 * Fills in the login form and submits it. Reusable across tests that
 * need a logged-in state without going through a full UI flow each time.
 */
async function loginViaForm(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.goto("/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
}

// ─── Tests ────────────────────────────────────────────────────────────────────

/**
 * SUITE 1: Unauthenticated redirects
 *
 * These tests verify that proxy.ts correctly intercepts requests
 * from users who are not logged in.
 */
test.describe("Unauthenticated redirects", () => {
  /**
   * THE CORE TEST from the spec:
   * "visit /app unauthenticated → redirected to /login"
   *
   * proxy.ts checks for a Supabase user on every /app/* request.
   * If there's no user, it redirects to /login?next=/app.
   */
  test("visiting /app unauthenticated redirects to /login", async ({
    page,
  }) => {
    // Clear all cookies/storage so we're definitely not logged in
    await page.context().clearCookies()

    await page.goto("/app")

    // Should land on /login (with or without ?next parameter)
    await expect(page).toHaveURL(/\/login/)
  })

  test("visiting /app/clients unauthenticated redirects to /login with ?next param", async ({
    page,
  }) => {
    await page.context().clearCookies()

    await page.goto("/app/clients")

    // Should redirect to /login?next=/app/clients
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fclients/)
  })

  test("visiting /app/settings unauthenticated redirects to /login", async ({
    page,
  }) => {
    await page.context().clearCookies()
    await page.goto("/app/settings")
    await expect(page).toHaveURL(/\/login/)
  })
})

/**
 * SUITE 2: Login page renders
 *
 * Basic smoke tests to verify the login page itself works.
 */
test.describe("Login page", () => {
  test("visiting /login shows the login form", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/login")

    // Should stay on /login (not redirected)
    await expect(page).toHaveURL(/\/login/)

    // Form elements should be present
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(
      page.getByRole("button", { name: /sign in|log in/i })
    ).toBeVisible()
  })
})

/**
 * SUITE 3: Login → redirect to /app
 *
 * THE CORE TEST from the spec:
 * "Visit /login → login → redirected to /app"
 *
 * These tests require TEST_USER_EMAIL and TEST_USER_PASSWORD to be set.
 * They are skipped if those env vars are missing (e.g. in CI without secrets).
 */
test.describe("Login flow", () => {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  test.beforeEach(async ({ page }) => {
    // Always start logged out
    await page.context().clearCookies()
  })

  test("successful login redirects to /app", async ({ page }) => {
    if (!email || !password) {
      test.skip(true, "TEST_USER_EMAIL / TEST_USER_PASSWORD not set")
      return
    }

    await loginViaForm(page, email, password)

    // After login, should land on /app (or /onboarding for new users)
    await expect(page).toHaveURL(/\/(app|onboarding)/, { timeout: 10_000 })
  })

  test("login with ?next param redirects to the original destination", async ({
    page,
  }) => {
    if (!email || !password) {
      test.skip(true, "TEST_USER_EMAIL / TEST_USER_PASSWORD not set")
      return
    }

    // Navigate to a protected route first — this sets ?next=/app/clients
    await page.goto("/app/clients")
    await expect(page).toHaveURL(/\/login/)

    // Now log in
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole("button", { name: /sign in|log in/i }).click()

    // Should land back at /app/clients (the original destination)
    await expect(page).toHaveURL(/\/app\/clients/, { timeout: 10_000 })
  })

  test("wrong password shows an error message", async ({ page }) => {
    if (!email) {
      test.skip(true, "TEST_USER_EMAIL not set")
      return
    }

    await loginViaForm(page, email, "wrong-password-xyz")

    // Should still be on /login with an error
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByText(/invalid|incorrect|wrong|check your email/i)
    ).toBeVisible({ timeout: 5_000 })
  })
})

/**
 * SUITE 4: Already-authenticated redirects
 *
 * proxy.ts should redirect logged-in users AWAY from auth pages.
 * These tests require a logged-in session.
 */
test.describe("Authenticated user accessing auth routes", () => {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  test("visiting /login while logged in redirects to /app", async ({
    page,
  }) => {
    if (!email || !password) {
      test.skip(true, "TEST_USER_EMAIL / TEST_USER_PASSWORD not set")
      return
    }

    // Log in first
    await page.context().clearCookies()
    await loginViaForm(page, email, password)
    await page.waitForURL(/\/(app|onboarding)/, { timeout: 10_000 })

    // Now try to visit /login again
    await page.goto("/login")

    // Should be redirected away from /login
    await expect(page).toHaveURL(/\/app/, { timeout: 5_000 })
  })
})
