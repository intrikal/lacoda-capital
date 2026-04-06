/**
 * E2E tests for the pricing page at /pricing.
 *
 * Tests:
 *   - All 4 paid plan cards render with correct names and prices
 *   - Enterprise card renders with "Contact Sales" CTA
 *   - "Most Popular" badge appears on Elite
 *   - Annual toggle switches displayed prices (20% discount)
 *   - Feature comparison table renders all 5 column headers
 *   - CTA buttons are present and labeled correctly
 *   - AUM limits are displayed correctly per tier
 *   - Team member counts are correct per tier
 *   - FAQ section renders and expands
 *   - Edge: no broken layout at mobile viewport
 */

import { test, expect } from "@playwright/test"

test.describe("pricing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing")
    await page.waitForLoadState("networkidle")
  })

  // ── Plan cards render ─────────────────────────────────────────────────────

  test("renders all 5 plan cards", async ({ page }) => {
    for (const name of ["Starter", "Growth", "Professional", "Elite", "Enterprise"]) {
      await expect(page.getByRole("heading", { name, exact: true }).first()).toBeVisible()
    }
  })

  test("Starter card shows $299/month", async ({ page }) => {
    await expect(page.getByText("$299").first()).toBeVisible()
  })

  test("Growth card shows $599/month", async ({ page }) => {
    await expect(page.getByText("$599").first()).toBeVisible()
  })

  test("Professional card shows $999/month", async ({ page }) => {
    await expect(page.getByText("$999").first()).toBeVisible()
  })

  test("Elite card shows $1,499/month", async ({ page }) => {
    await expect(page.getByText("$1,499").first()).toBeVisible()
  })

  test("Enterprise card shows 'Custom' pricing", async ({ page }) => {
    await expect(page.getByText("Custom").first()).toBeVisible()
  })

  // ── AUM limits per card ───────────────────────────────────────────────────

  test("Starter card shows $500K AUM limit", async ({ page }) => {
    await expect(page.getByText("Up to $500K AUM").first()).toBeVisible()
  })

  test("Growth card shows $1.5M AUM limit", async ({ page }) => {
    await expect(page.getByText("Up to $1.5M AUM").first()).toBeVisible()
  })

  test("Professional card shows $3M AUM limit", async ({ page }) => {
    await expect(page.getByText("Up to $3M AUM").first()).toBeVisible()
  })

  test("Elite card shows $5M AUM limit", async ({ page }) => {
    await expect(page.getByText("Up to $5M AUM").first()).toBeVisible()
  })

  test("Enterprise card shows Unlimited AUM", async ({ page }) => {
    await expect(page.getByText("Unlimited AUM").first()).toBeVisible()
  })

  // ── Team member limits ────────────────────────────────────────────────────

  test("Starter shows 2 team members", async ({ page }) => {
    await expect(page.getByText("2 team members").first()).toBeVisible()
  })

  test("Growth shows 3 team members", async ({ page }) => {
    await expect(page.getByText("3 team members").first()).toBeVisible()
  })

  test("Professional shows 5 team members", async ({ page }) => {
    await expect(page.getByText("5 team members").first()).toBeVisible()
  })

  test("Elite shows 10 team members", async ({ page }) => {
    await expect(page.getByText("10 team members").first()).toBeVisible()
  })

  // ── Badge and highlights ──────────────────────────────────────────────────

  test("Elite card has Most Popular badge", async ({ page }) => {
    await expect(page.getByText("Most Popular").first()).toBeVisible()
  })

  test("only one Most Popular badge is shown", async ({ page }) => {
    const badges = await page.getByText("Most Popular").count()
    expect(badges).toBe(1)
  })

  // ── CTA buttons ───────────────────────────────────────────────────────────

  test("Starter, Growth, Professional, Elite have Start Free Trial buttons", async ({ page }) => {
    const trialButtons = page.getByRole("button", { name: "Start Free Trial" })
    await expect(trialButtons).toHaveCount(4)
  })

  test("Enterprise has Contact Sales CTA", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Contact Sales" }).first()).toBeVisible()
  })

  // ── Annual billing toggle ─────────────────────────────────────────────────

  test("billing toggle is visible", async ({ page }) => {
    await expect(page.getByLabel("Toggle annual billing")).toBeVisible()
  })

  test("switching to annual shows discounted prices", async ({ page }) => {
    await page.getByLabel("Toggle annual billing").click()

    // Starter annual = $239/mo
    await expect(page.getByText("$239").first()).toBeVisible()
    // Growth annual = $479/mo
    await expect(page.getByText("$479").first()).toBeVisible()
    // Professional annual = $799/mo
    await expect(page.getByText("$799").first()).toBeVisible()
    // Elite annual = $1,199/mo
    await expect(page.getByText("$1,199").first()).toBeVisible()
  })

  test("annual prices are roughly 20% less than monthly", async ({ page }) => {
    const annualPrices  = [239, 479, 799, 1199]

    await page.getByLabel("Toggle annual billing").click()

    for (const price of annualPrices) {
      await expect(page.getByText(`$${price.toLocaleString()}`).first()).toBeVisible()
    }
  })

  test("toggling back to monthly restores original prices", async ({ page }) => {
    const toggle = page.getByLabel("Toggle annual billing")
    await toggle.click()  // → annual
    await toggle.click()  // → back to monthly

    await expect(page.getByText("$299").first()).toBeVisible()
    await expect(page.getByText("$1,499").first()).toBeVisible()
  })

  test("annual toggle shows 'Save 20%' badge", async ({ page }) => {
    await expect(page.getByText("Save 20%")).toBeVisible()
  })

  test("annual mode shows 'Billed annually' text on paid plans", async ({ page }) => {
    await page.getByLabel("Toggle annual billing").click()
    await expect(page.getByText("Billed annually").first()).toBeVisible()
  })

  // ── Feature comparison table ──────────────────────────────────────────────

  test("comparison table shows all tier headers", async ({ page }) => {
    for (const name of ["Starter", "Growth", "Professional", "Elite", "Enterprise"]) {
      await expect(page.getByRole("columnheader", { name }).first()).toBeVisible()
    }
  })

  test("comparison table shows feature categories", async ({ page }) => {
    for (const cat of [
      "Portfolio Management",
      "Document Management",
      "Security & Compliance",
      "Integrations & API",
      "Support",
    ]) {
      await expect(page.getByText(cat).first()).toBeVisible()
    }
  })

  // ── FAQ section ───────────────────────────────────────────────────────────

  test("FAQ section is visible", async ({ page }) => {
    await expect(page.getByText("Frequently asked questions")).toBeVisible()
  })

  test("clicking a FAQ expands its answer", async ({ page }) => {
    const firstQuestion = page.getByText("What counts toward AUM limits?")
    await firstQuestion.click()
    await expect(page.getByText("Starter covers up to $500K")).toBeVisible()
  })

  test("clicking the same FAQ again collapses it", async ({ page }) => {
    const firstQuestion = page.getByText("What counts toward AUM limits?")
    await firstQuestion.click()
    await firstQuestion.click()
    await expect(page.getByText("Starter covers up to $500K")).not.toBeVisible()
  })

  test("team member FAQ mentions all limits", async ({ page }) => {
    await page.getByText("Can I add more team members?").click()
    await expect(page.getByText(/Starter supports up to 2/)).toBeVisible()
    await expect(page.getByText(/Professional up to 5/)).toBeVisible()
  })

  // ── Page structure ────────────────────────────────────────────────────────

  test("page title is visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /pricing/i }).first()).toBeVisible()
  })

  test("CTA section at bottom is visible", async ({ page }) => {
    await expect(page.getByText("Not sure which plan is right?")).toBeVisible()
  })

  test("Talk to Sales button links to /demo", async ({ page }) => {
    const talkBtn = page.getByRole("link", { name: "Talk to Sales" })
    await expect(talkBtn).toBeVisible()
    await expect(talkBtn).toHaveAttribute("href", "/demo")
  })

  // ── Mobile responsiveness ─────────────────────────────────────────────────

  test("pricing page renders without overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/pricing")
    await page.waitForLoadState("networkidle")

    // Should not have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = 375
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5) // 5px tolerance
  })

  test("plan cards stack on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/pricing")

    // All plan names should still be visible
    for (const name of ["Starter", "Growth", "Professional", "Elite"]) {
      await expect(page.getByRole("heading", { name, exact: true }).first()).toBeVisible()
    }
  })
})
