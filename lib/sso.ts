import type { SamlAttributeMapping } from "@/app/db/schema/saml_providers"

/**
 * SAML attribute mapping — resolves user fields from IdP assertions.
 *
 * Different IdPs use different attribute names:
 * - Okta:            email, firstName, lastName, groups
 * - Azure AD:        http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
 * - Google Workspace: email, name, groups
 *
 * This function maps the IdP's attribute names to our internal fields.
 */

// ─── Pre-built IdP attribute presets ─────────────────────────────────────────

export const IDP_PRESETS: Record<string, { name: string; attributeMapping: SamlAttributeMapping }> = {
  okta: {
    name: "Okta",
    attributeMapping: {
      email: "email",
      firstName: "firstName",
      lastName: "lastName",
      groups: "groups",
    },
  },
  azure_ad: {
    name: "Azure AD",
    attributeMapping: {
      email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname",
      firstName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
      lastName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
      groups: "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups",
    },
  },
  google_workspace: {
    name: "Google Workspace",
    attributeMapping: {
      email: "email",
      firstName: "first_name",
      lastName: "last_name",
      groups: "groups",
    },
  },
  custom: {
    name: "Custom SAML 2.0",
    attributeMapping: {
      email: "email",
      name: "displayName",
      groups: "groups",
    },
  },
}

// ─── Attribute extraction ────────────────────────────────────────────────────

export interface SamlAssertionAttributes {
  [key: string]: string | string[] | undefined
}

export interface MappedUserAttributes {
  email: string
  fullName: string | null
  groups: string[]
}

/**
 * Extract user attributes from a SAML assertion using the configured mapping.
 */
export function mapSamlAttributes(
  assertion: SamlAssertionAttributes,
  mapping: SamlAttributeMapping
): MappedUserAttributes {
  const email = extractSingle(assertion, mapping.email ?? "email")
  if (!email) {
    throw new Error("SAML assertion missing required email attribute")
  }

  // Build full name from either 'name' attribute or firstName + lastName
  let fullName: string | null = null
  if (mapping.name) {
    fullName = extractSingle(assertion, mapping.name) ?? null
  }
  if (!fullName && (mapping.firstName || mapping.lastName)) {
    const first = extractSingle(assertion, mapping.firstName ?? "firstName") ?? ""
    const last = extractSingle(assertion, mapping.lastName ?? "lastName") ?? ""
    fullName = [first, last].filter(Boolean).join(" ") || null
  }

  // Extract groups (may be single string or array)
  const groups = extractArray(assertion, mapping.groups ?? "groups")

  return { email, fullName, groups }
}

/**
 * Resolve user role from IdP groups using the group→role mapping.
 */
export function resolveRoleFromGroups(
  groups: string[],
  groupRoleMapping: Record<string, string>,
  defaultRole: string
): string {
  // Check groups in order — first match wins
  for (const group of groups) {
    const role = groupRoleMapping[group]
    if (role) return role
  }
  return defaultRole
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractSingle(
  attrs: SamlAssertionAttributes,
  key: string
): string | undefined {
  const val = attrs[key]
  if (Array.isArray(val)) return val[0]
  return val
}

function extractArray(
  attrs: SamlAssertionAttributes,
  key: string
): string[] {
  const val = attrs[key]
  if (!val) return []
  if (Array.isArray(val)) return val
  return [val]
}
