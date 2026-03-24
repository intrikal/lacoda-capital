/**
 * Branding CSS Variable Tests
 *
 * Tests that org branding settings produce correct CSS custom properties.
 */

import { describe, it, expect } from "vitest"
import { generateBrandingCss, getBrandingDisplay, brandingVarsToStyle } from "@/lib/branding"
import type { OrgSettings } from "@/app/db/schema/orgs"

describe("branding CSS variable generation", () => {
  it("hex #0D9488 generates correct CSS custom property", () => {
    const settings: OrgSettings = {
      branding: { primaryColor: "#0D9488" },
    }
    const vars = generateBrandingCss(settings)
    expect(vars["--brand-primary"]).toBe("#0D9488")
  })

  it("generates light variant from primary color", () => {
    const settings: OrgSettings = {
      branding: { primaryColor: "#0D9488" },
    }
    const vars = generateBrandingCss(settings)
    expect(vars["--brand-primary-light"]).toBeTruthy()
    expect(vars["--brand-primary-light"]).not.toBe("#0D9488")
    // Light variant should be a valid hex
    expect(vars["--brand-primary-light"]).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it("generates dark variant from primary color", () => {
    const settings: OrgSettings = {
      branding: { primaryColor: "#0D9488" },
    }
    const vars = generateBrandingCss(settings)
    expect(vars["--brand-primary-dark"]).toBeTruthy()
    expect(vars["--brand-primary-dark"]).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it("generates muted (alpha) variant", () => {
    const settings: OrgSettings = {
      branding: { primaryColor: "#0D9488" },
    }
    const vars = generateBrandingCss(settings)
    expect(vars["--brand-primary-muted"]).toContain("rgba(")
    expect(vars["--brand-primary-muted"]).toContain("0.15")
  })

  it("applies accent color from settings", () => {
    const settings: OrgSettings = {
      branding: { primaryColor: "#FF5733", accentColor: "#33FF57" },
    }
    const vars = generateBrandingCss(settings)
    expect(vars["--brand-accent"]).toBe("#33FF57")
  })

  it("falls back to default teal when no settings provided", () => {
    const vars = generateBrandingCss(undefined)
    expect(vars["--brand-primary"]).toBe("#0FBFBF")
    expect(vars["--brand-accent"]).toBe("#06b6d4")
  })

  it("falls back to defaults when branding is empty", () => {
    const vars = generateBrandingCss({})
    expect(vars["--brand-primary"]).toBe("#0FBFBF")
  })
})

describe("branding display values", () => {
  it("returns logo URL from settings", () => {
    const settings: OrgSettings = {
      branding: { logoUrl: "https://cdn.example.com/logo.png" },
    }
    const display = getBrandingDisplay(settings, "Acme Capital")
    expect(display.logoUrl).toBe("https://cdn.example.com/logo.png")
  })

  it("returns null logo when not set", () => {
    const display = getBrandingDisplay({}, "Acme")
    expect(display.logoUrl).toBeNull()
  })

  it("uses orgDisplayName override when set", () => {
    const settings: OrgSettings = {
      branding: { orgDisplayName: "Acme Advisory Group" },
    }
    const display = getBrandingDisplay(settings, "Acme Capital Holdings LLC")
    expect(display.displayName).toBe("Acme Advisory Group")
  })

  it("falls back to org name when no display name override", () => {
    const display = getBrandingDisplay({}, "Acme Capital")
    expect(display.displayName).toBe("Acme Capital")
  })

  it("returns custom domain when configured", () => {
    const settings: OrgSettings = {
      branding: { customDomain: "portal.acme.com" },
    }
    const display = getBrandingDisplay(settings)
    expect(display.customDomain).toBe("portal.acme.com")
  })

  it("returns null custom domain when not configured", () => {
    const display = getBrandingDisplay({})
    expect(display.customDomain).toBeNull()
  })
})

describe("brandingVarsToStyle", () => {
  it("converts BrandingVars to a style object", () => {
    const vars = generateBrandingCss({ branding: { primaryColor: "#FF0000" } })
    const style = brandingVarsToStyle(vars)
    expect(style["--brand-primary"]).toBe("#FF0000")
    expect(typeof style).toBe("object")
  })
})
