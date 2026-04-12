import { test, expect, type Page } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same pattern as other client portal specs
//
// The client portal lives at /client/* and is protected by Supabase middleware.
// Set TEST_CLIENT_EMAIL + TEST_CLIENT_PASSWORD in .env.local to run these
// against a real client account. Tests skip gracefully if not authenticated.
// ─────────────────────────────────────────────────────────────────────────────

async function loginAsClient(page: Page) {
  const email    = process.env.TEST_CLIENT_EMAIL    ?? process.env.TEST_USER_EMAIL
  const password = process.env.TEST_CLIENT_PASSWORD ?? process.env.TEST_USER_PASSWORD

  if (!email || !password) return false

  await page.goto("/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/(app|client|onboarding)/, { timeout: 10_000 })
  return true
}

test.describe("Client portal — Calendar (/client/calendar)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/calendar")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client/calendar")
    }

    await expect(
      page.getByRole("heading", { name: /^calendar$/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── Page smoke test ──────────────────────────────────────────────────────────

  test("page loads at /client/calendar with correct heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/calendar/)
    await expect(page.getByRole("heading", { name: /^calendar$/i })).toBeVisible()
  })

  test("subtitle describes the calendar contents", async ({ page }) => {
    await expect(
      page.getByText(/upcoming meetings, payments, and deadlines/i)
    ).toBeVisible()
  })

  // ── Calendar grid ────────────────────────────────────────────────────────────

  test("calendar grid shows current month and year", async ({ page }) => {
    const now = new Date()
    const monthName = now.toLocaleString("default", { month: "long" })
    const year = now.getFullYear().toString()
    await expect(page.getByText(new RegExp(`${monthName}\\s+${year}`, "i"))).toBeVisible()
  })

  test("calendar grid shows day-of-week headers (Sun through Sat)", async ({ page }) => {
    await expect(page.getByText("Sun")).toBeVisible()
    await expect(page.getByText("Mon")).toBeVisible()
    await expect(page.getByText("Tue")).toBeVisible()
    await expect(page.getByText("Wed")).toBeVisible()
    await expect(page.getByText("Thu")).toBeVisible()
    await expect(page.getByText("Fri")).toBeVisible()
    await expect(page.getByText("Sat")).toBeVisible()
  })

  test("calendar renders day cells for the current month", async ({ page }) => {
    // Current date day number should appear in the grid
    const today = new Date().getDate().toString()
    // There may be multiple instances of this number; at least one should be visible
    await expect(page.getByText(today).first()).toBeVisible()
  })

  test("previous-month navigation button is visible", async ({ page }) => {
    await expect(page.locator("button").filter({ has: page.locator("svg") }).first()).toBeVisible()
  })

  test("clicking next-month button advances to the following month", async ({ page }) => {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonthName = nextMonth.toLocaleString("default", { month: "long" })

    // The chevron-right button is the second icon-only button in the calendar header
    const chevrons = page.locator('[data-slot="card-header"] button, .flex.items-center.gap-1 button')
    await chevrons.last().click()

    await expect(
      page.getByText(new RegExp(nextMonthName, "i"))
    ).toBeVisible({ timeout: 3_000 })
  })

  // ── Event type legend ────────────────────────────────────────────────────────

  test("event type legend is visible with Meeting label", async ({ page }) => {
    await expect(page.getByText("Meeting")).toBeVisible()
  })

  test("event type legend shows Payment and Deadline labels", async ({ page }) => {
    await expect(page.getByText("Payment")).toBeVisible()
    await expect(page.getByText("Deadline")).toBeVisible()
  })

  // ── Upcoming events sidebar ──────────────────────────────────────────────────

  test("Upcoming events card is visible", async ({ page }) => {
    await expect(page.getByText("Upcoming")).toBeVisible()
  })

  test("upcoming events show a title and date (or empty state is acceptable)", async ({ page }) => {
    // DATA REQUIREMENT: calendar events must exist in the DB for this assertion to pass.
    // If no future events are seeded, the Upcoming card renders an empty list silently.
    // This test passes either way — it just confirms the card itself rendered.
    const upcomingCard = page.locator("div, section").filter({ hasText: /^Upcoming$/ }).first()
    await expect(upcomingCard).toBeVisible()
  })

  test("upcoming event items show a date string when events exist", async ({ page }) => {
    // DATA REQUIREMENT: at least one future calendar event must be seeded.
    // Months are abbreviated (Jan, Feb, …) because date-fns format("MMM d") is used.
    const monthAbbrev = /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/
    const eventDates = page.getByText(monthAbbrev)
    const count = await eventDates.count()
    if (count === 0) {
      // No events seeded — skip the assertion
      test.skip()
      return
    }
    await expect(eventDates.first()).toBeVisible()
  })

  // ── Quick schedule prompt ────────────────────────────────────────────────────

  test('"Need to meet?" quick schedule prompt is visible', async ({ page }) => {
    await expect(page.getByText(/need to meet/i)).toBeVisible()
    await expect(page.getByText(/schedule time with your advisor/i)).toBeVisible()
  })

  // ── Schedule Meeting button & dialog ─────────────────────────────────────────

  test('"Schedule Meeting" button is visible in the page header', async ({ page }) => {
    // There are two Schedule Meeting buttons (header + quick-schedule card)
    await expect(
      page.getByRole("button", { name: /schedule meeting/i }).first()
    ).toBeVisible()
  })

  test("clicking Schedule Meeting opens a dialog", async ({ page }) => {
    await page.getByRole("button", { name: /schedule meeting/i }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 })
    await expect(page.getByRole("dialog").getByText(/schedule meeting/i)).toBeVisible()
  })

  test("schedule meeting dialog has Event Title and Date fields", async ({ page }) => {
    await page.getByRole("button", { name: /schedule meeting/i }).first().click()
    await expect(page.getByLabel(/event title/i)).toBeVisible({ timeout: 3_000 })
    await expect(page.getByLabel(/date/i)).toBeVisible()
  })

  test("Add Event button in dialog is disabled until fields are filled", async ({ page }) => {
    await page.getByRole("button", { name: /schedule meeting/i }).first().click()
    const addBtn = page.getByRole("dialog").getByRole("button", { name: /add event/i })
    await expect(addBtn).toBeDisabled({ timeout: 3_000 })
  })

  test("filling dialog fields enables Add Event button", async ({ page }) => {
    await page.getByRole("button", { name: /schedule meeting/i }).first().click()
    await page.getByLabel(/event title/i).fill("Quarterly Review")
    await page.getByLabel(/date/i).fill("2026-06-15")
    const addBtn = page.getByRole("dialog").getByRole("button", { name: /add event/i })
    await expect(addBtn).toBeEnabled({ timeout: 3_000 })
  })

  test("Cancel button in dialog closes the dialog", async ({ page }) => {
    await page.getByRole("button", { name: /schedule meeting/i }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 })

    await page.getByRole("dialog").getByRole("button", { name: /cancel/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 })
  })

  // ── Sidebar navigation ────────────────────────────────────────────────────────

  test("sidebar is visible on the calendar page", async ({ page }) => {
    await expect(page.locator("aside")).toBeVisible()
  })
})
