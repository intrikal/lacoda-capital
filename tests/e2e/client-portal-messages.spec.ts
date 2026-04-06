import { test, expect, type Page } from "@playwright/test"

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — same pattern as other client portal specs
// ─────────────────────────────────────────────────────────────────────────────

async function loginAsClient(page: Page) {
  const email = process.env.TEST_CLIENT_EMAIL ?? process.env.TEST_USER_EMAIL
  const password = process.env.TEST_CLIENT_PASSWORD ?? process.env.TEST_USER_PASSWORD

  if (!email || !password) return false

  await page.goto("/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/(app|client|onboarding)/, { timeout: 10_000 })
  return true
}

test.describe("Client portal — Messages (/client/messages)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/messages")

    if (page.url().includes("/login")) {
      const loggedIn = await loginAsClient(page)
      if (!loggedIn) {
        test.skip()
        return
      }
      await page.goto("/client/messages")
    }

    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible({ timeout: 10_000 })
  })

  test("page loads at /client/messages with correct heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/messages/)
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible()
    await expect(page.getByText(/communicate with your advisory team/i)).toBeVisible()
  })

  test("conversation count badge is visible in the header", async ({ page }) => {
    await expect(page.getByText(/conversations/i)).toBeVisible()
  })

  test("conversation search input is visible", async ({ page }) => {
    await expect(page.getByPlaceholder("Search conversations...")).toBeVisible()
  })

  test("conversation list renders at least one item", async ({ page }) => {
    // The sidebar renders ConversationItem buttons — wait for at least one
    const conversationButtons = page.locator("[class*='border-zinc-800'] button[class*='border-b']")
    await expect(conversationButtons.first()).toBeVisible({ timeout: 5_000 })
  })

  test("first conversation is auto-selected and shows message thread", async ({ page }) => {
    // The page auto-selects the first conversation on load.
    // The chat area should show the conversation name in the chat header.
    const chatHeader = page.locator("[class*='border-b'][class*='border-zinc-800/60']").filter({
      has: page.getByRole("button", { name: /phone/i }),
    })
    await expect(chatHeader).toBeVisible({ timeout: 5_000 })
  })

  test("message input is visible at the bottom of the chat area", async ({ page }) => {
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible({ timeout: 5_000 })
  })

  test("send button is disabled when message input is empty", async ({ page }) => {
    const input = page.getByPlaceholder("Type a message...")
    await expect(input).toBeVisible({ timeout: 5_000 })
    // Input starts empty; send button (icon button next to input) should be disabled
    // Alternatively target by position: the button immediately after the input
    const inputContainer = input.locator("..")
    await expect(inputContainer.locator("button[disabled]")).toBeVisible()
  })

  test("send button becomes enabled when the user types a message", async ({ page }) => {
    const input = page.getByPlaceholder("Type a message...")
    await expect(input).toBeVisible({ timeout: 5_000 })
    await input.fill("Hello, I have a question about my portfolio.")
    // The send button is no longer disabled once the input has content
    const sendButton = page.locator("button:not([disabled])").filter({
      has: page.locator("svg"),
    }).last()
    await expect(sendButton).toBeEnabled()
  })

  test("sending a message clears the input field", async ({ page }) => {
    const input = page.getByPlaceholder("Type a message...")
    await expect(input).toBeVisible({ timeout: 5_000 })

    const message = "Test message from E2E"
    await input.fill(message)
    await input.press("Enter")

    // Input should be cleared after sending
    await expect(input).toHaveValue("", { timeout: 3_000 })
  })

  test("searching conversations filters the list", async ({ page }) => {
    const search = page.getByPlaceholder("Search conversations...")
    await search.fill("zzz-no-match-xyz")
    await expect(page.getByText(/no conversations found/i)).toBeVisible({ timeout: 3_000 })
  })

  test("end-to-end encrypted notice is visible in the input area", async ({ page }) => {
    await expect(page.getByText(/end-to-end encrypted/i)).toBeVisible({ timeout: 5_000 })
  })
})
