import { test, expect } from "@playwright/test"

test.describe("Demo mode at /demo/app", () => {
  test("/demo/app loads without login and renders dashboard with data", async ({ page }) => {
    await page.goto("/demo/app")

    // Should NOT redirect to login
    expect(page.url()).toContain("/demo/app")

    // Dashboard renders with data
    await expect(page.getByText("Welcome back, Sarah")).toBeVisible()
    await expect(page.getByText("Assets Under Management")).toBeVisible()

    // Demo banner is visible
    await expect(page.getByText("Viewing demo")).toBeVisible()
    await expect(page.getByText("sign up to manage your portfolio")).toBeVisible()
  })

  test("demo banner has sign up link", async ({ page }) => {
    await page.goto("/demo/app")
    const signUpButton = page.getByRole("link", { name: /sign up/i })
    await expect(signUpButton).toBeVisible()
  })

  test("mutation buttons in demo show tooltip instead of opening form", async ({ page }) => {
    await page.goto("/demo/app/clients")

    // The "Add Client" button should be wrapped in DemoMutationTooltip
    const addButton = page.getByText("+ Add Client")
    await expect(addButton).toBeVisible()

    // Hover and check tooltip appears
    await addButton.hover()
    await expect(page.getByText("Sign up to use this")).toBeVisible({ timeout: 3000 })
  })

  test("Create Asset in demo shows tooltip, no form opens", async ({ page }) => {
    await page.goto("/demo/app/assets")

    const createButton = page.getByText("+ Create Asset")
    await expect(createButton).toBeVisible()

    await createButton.hover()
    await expect(page.getByText("Sign up to use this")).toBeVisible({ timeout: 3000 })

    // No dialog should open
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })

  test("demo sidebar navigation works", async ({ page }) => {
    await page.goto("/demo/app")

    // Navigate to clients
    await page.getByRole("link", { name: "Clients" }).click()
    await expect(page.getByText("active clients")).toBeVisible()

    // Navigate to compliance
    await page.getByRole("link", { name: "Compliance" }).click()
    await expect(page.getByText("Compliance Score")).toBeVisible()
  })

  test("demo compliance page shows framework progress", async ({ page }) => {
    await page.goto("/demo/app/compliance")

    await expect(page.getByText("SOC2")).toBeVisible()
    await expect(page.getByText("Framework Progress")).toBeVisible()
  })

  test("/demo/app does NOT fire PostHog events", async ({ page }) => {
    // Intercept all network requests to PostHog
    const posthogRequests: string[] = []
    page.on("request", (request) => {
      if (request.url().includes("posthog") || request.url().includes("i.posthog.com")) {
        posthogRequests.push(request.url())
      }
    })

    await page.goto("/demo/app")
    await page.waitForTimeout(2000) // Wait for any async tracking

    // No PostHog requests should have been made from demo routes
    expect(posthogRequests).toHaveLength(0)
  })
})
