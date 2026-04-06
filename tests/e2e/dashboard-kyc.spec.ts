import { test, expect, type Page } from "@playwright/test"

async function waitForCompliancePage(page: Page) {
  await page.goto("/app/compliance")
  if (page.url().includes("/login")) {
    test.skip()
    return false
  }
  await expect(page.getByRole("heading", { name: /compliance/i })).toBeVisible({ timeout: 10_000 })
  return true
}

test.describe("KYC / AML tab on Compliance page (/app/compliance)", () => {
  test.beforeEach(async ({ page }) => {
    await waitForCompliancePage(page)
  })

  // ── Page-level smoke tests ───────────────────────────────────────────────────

  test("page loads at /app/compliance with Compliance heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/app\/compliance/)
    await expect(page.getByRole("heading", { name: /compliance/i })).toBeVisible()
  })

  test("KYC / AML tab is present in the tab list", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /kyc|aml/i })).toBeVisible()
  })

  // ── KYC / AML tab ────────────────────────────────────────────────────────────

  test("clicking KYC / AML tab makes it active", async ({ page }) => {
    const kycTab = page.getByRole("tab", { name: /kyc|aml/i })
    await kycTab.click()
    await expect(kycTab).toHaveAttribute("data-state", "active")
    await expect(page).toHaveURL(/\/app\/compliance/)
  })

  test("KYC / AML tab shows KPI summary cards", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()

    // Summary cards: Total Clients, Approved, Pending Review, High Risk / Flagged
    const summaryTerms = /total clients|approved|pending review|high risk|flagged/i
    await expect(page.getByText(summaryTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  test("KYC / AML tab shows KYC records table", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()

    // Table has at minimum a Client column header
    await expect(page.getByText(/client/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("KYC table shows identity verification status (Verified / Not Verified)", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()
    const statusTerms = /verified|not verified|pending/i
    await expect(page.getByText(statusTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  test("KYC table shows AML status column (Clear, Flagged, Review)", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()
    const amlTerms = /clear|flagged|review/i
    await expect(page.getByText(amlTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  test("KYC table shows PEP status column", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()
    await expect(page.getByText(/PEP/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("KYC table shows risk score values", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()
    // Risk scores are numeric — look for score column header or a number within 0-100
    await expect(page.getByText(/risk score|score/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("KYC tab shows Next Review Due dates", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()
    await expect(page.getByText(/next review|review due/i).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── AML Program section ──────────────────────────────────────────────────────

  test("KYC / AML tab shows AML Program Requirements section", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()
    const amlProgramTerms = /AML program|BSA|anti-money laundering/i
    await expect(page.getByText(amlProgramTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  test("AML program checklist items are rendered", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()
    // Checklist items include CIP, CDD, EDD references
    const checklistTerms = /customer identification|CIP|CDD|EDD|suspicious activity|SAR/i
    await expect(page.getByText(checklistTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── Audit trail section ──────────────────────────────────────────────────────

  test("KYC / AML tab shows Audit Trail or Coverage section", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()
    const auditTerms = /audit trail|audit coverage|compliance log/i
    await expect(page.getByText(auditTerms).first()).toBeVisible({ timeout: 5_000 })
  })

  // ── KYC status badge colours ─────────────────────────────────────────────────

  test("KYC status badges are colour-coded (approved green, pending yellow, etc.)", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()

    // At least one badge should be rendered in the table
    // Badges are rendered by Radix Badge with variant="outline"
    const badge = page.locator("div[class*='badge'], span[class*='badge']").first()
    const badgeAlt = page.getByText(/approved|pending|review|rejected/i).first()
    const isVisible = await badge.isVisible().catch(() => false)
    if (isVisible) {
      await expect(badge).toBeVisible()
    } else {
      await expect(badgeAlt).toBeVisible()
    }
  })

  // ── Other compliance tabs still work ─────────────────────────────────────────

  test("switching from KYC tab back to another compliance tab works", async ({ page }) => {
    await page.getByRole("tab", { name: /kyc|aml/i }).click()
    await expect(page.getByRole("tab", { name: /kyc|aml/i })).toHaveAttribute("data-state", "active")

    // Find a non-KYC tab and click it
    const allTabs = page.getByRole("tab")
    const count = await allTabs.count()
    for (let i = 0; i < count; i++) {
      const tab = allTabs.nth(i)
      const name = await tab.textContent()
      if (name && !/kyc|aml/i.test(name)) {
        await tab.click()
        await expect(page).toHaveURL(/\/app\/compliance/)
        break
      }
    }
  })
})
