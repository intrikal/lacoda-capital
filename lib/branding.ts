import type { OrgSettings } from "@/app/db/schema/orgs"

/**
 * Branding utilities — generates CSS custom properties from org settings.
 *
 * Used by both the stakeholder portal and PDF reports to apply
 * org-specific branding (logo, colors).
 */

export interface BrandingVars {
  "--brand-primary": string
  "--brand-primary-light": string
  "--brand-primary-dark": string
  "--brand-primary-muted": string
  "--brand-accent": string
  [key: string]: string
}

/**
 * Convert a hex color to CSS custom properties for the branding theme.
 * Creates light, dark, and muted variants from the base color.
 */
export function generateBrandingCss(settings?: OrgSettings): BrandingVars {
  const primary = settings?.branding?.primaryColor ?? "#0FBFBF"
  const accent = settings?.branding?.accentColor ?? "#06b6d4"

  return {
    "--brand-primary": primary,
    "--brand-primary-light": lighten(primary, 0.2),
    "--brand-primary-dark": darken(primary, 0.15),
    "--brand-primary-muted": withAlpha(primary, 0.15),
    "--brand-accent": accent,
  }
}

/**
 * Get branding display values (logo URL, org name) for portal rendering.
 */
export function getBrandingDisplay(settings?: OrgSettings, orgName?: string) {
  return {
    logoUrl: settings?.branding?.logoUrl ?? null,
    displayName: settings?.branding?.orgDisplayName ?? orgName ?? "Portal",
    primaryColor: settings?.branding?.primaryColor ?? "#0FBFBF",
    customDomain: settings?.branding?.customDomain ?? null,
  }
}

/**
 * Convert BrandingVars to a CSS style string for inline use.
 */
export function brandingVarsToStyle(vars: BrandingVars): Record<string, string> {
  return { ...vars } as Record<string, string>
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "")
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("")
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  )
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
