/**
 * SSO Attribute Mapping Tests
 *
 * Tests that SAML assertion attributes are correctly mapped to user fields
 * for different IdP formats: Okta, Azure AD, Google Workspace.
 */

import { describe, it, expect } from "vitest"
import {
  mapSamlAttributes,
  resolveRoleFromGroups,
  IDP_PRESETS,
  type SamlAssertionAttributes,
} from "@/lib/sso"

// ─── Okta format ─────────────────────────────────────────────────────────────

describe("attribute mapping — Okta format", () => {
  const mapping = IDP_PRESETS.okta.attributeMapping

  it("correctly maps email from Okta assertion", () => {
    const assertion: SamlAssertionAttributes = {
      email: "alice@acme.com",
      firstName: "Alice",
      lastName: "Smith",
      groups: ["Admins", "Engineering"],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.email).toBe("alice@acme.com")
  })

  it("correctly maps name from Okta firstName + lastName", () => {
    const assertion: SamlAssertionAttributes = {
      email: "alice@acme.com",
      firstName: "Alice",
      lastName: "Smith",
      groups: [],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.fullName).toBe("Alice Smith")
  })

  it("correctly maps groups from Okta assertion", () => {
    const assertion: SamlAssertionAttributes = {
      email: "alice@acme.com",
      firstName: "Alice",
      lastName: "Smith",
      groups: ["Admins", "Engineering"],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.groups).toEqual(["Admins", "Engineering"])
  })

  it("handles single group as string (not array)", () => {
    const assertion: SamlAssertionAttributes = {
      email: "bob@acme.com",
      firstName: "Bob",
      lastName: "Jones",
      groups: "Admins",
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.groups).toEqual(["Admins"])
  })
})

// ─── Azure AD format ─────────────────────────────────────────────────────────

describe("attribute mapping — Azure AD format", () => {
  const mapping = IDP_PRESETS.azure_ad.attributeMapping

  it("correctly maps email from Azure AD claims", () => {
    const assertion: SamlAssertionAttributes = {
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": "alice@corp.com",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname": "Alice Smith",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname": "Alice",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname": "Smith",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups": ["group-id-1"],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.email).toBe("alice@corp.com")
  })

  it("correctly maps display name from Azure AD claims", () => {
    const assertion: SamlAssertionAttributes = {
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": "alice@corp.com",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/displayname": "Alice Smith",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups": [],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.fullName).toBe("Alice Smith")
  })

  it("falls back to firstName + lastName when displayName is missing", () => {
    const assertion: SamlAssertionAttributes = {
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": "bob@corp.com",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname": "Bob",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname": "Jones",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups": [],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.fullName).toBe("Bob Jones")
  })
})

// ─── Google Workspace format ─────────────────────────────────────────────────

describe("attribute mapping — Google Workspace format", () => {
  const mapping = IDP_PRESETS.google_workspace.attributeMapping

  it("correctly maps email from Google Workspace assertion", () => {
    const assertion: SamlAssertionAttributes = {
      email: "alice@company.org",
      first_name: "Alice",
      last_name: "Smith",
      groups: ["finance@company.org", "admin@company.org"],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.email).toBe("alice@company.org")
  })

  it("correctly maps name from Google Workspace first/last", () => {
    const assertion: SamlAssertionAttributes = {
      email: "alice@company.org",
      first_name: "Alice",
      last_name: "Smith",
      groups: [],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.fullName).toBe("Alice Smith")
  })

  it("correctly maps groups from Google Workspace assertion", () => {
    const assertion: SamlAssertionAttributes = {
      email: "alice@company.org",
      first_name: "Alice",
      last_name: "Smith",
      groups: ["finance@company.org", "admin@company.org"],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.groups).toEqual(["finance@company.org", "admin@company.org"])
  })
})

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe("attribute mapping — edge cases", () => {
  it("throws when email attribute is missing", () => {
    const mapping = IDP_PRESETS.okta.attributeMapping
    const assertion: SamlAssertionAttributes = {
      firstName: "Alice",
      lastName: "Smith",
    }
    expect(() => mapSamlAttributes(assertion, mapping)).toThrow(
      "SAML assertion missing required email attribute"
    )
  })

  it("returns null fullName when no name attributes are present", () => {
    const mapping = IDP_PRESETS.custom.attributeMapping
    const assertion: SamlAssertionAttributes = {
      email: "alice@acme.com",
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.fullName).toBeNull()
  })

  it("returns empty groups when groups attribute is missing", () => {
    const mapping = IDP_PRESETS.okta.attributeMapping
    const assertion: SamlAssertionAttributes = {
      email: "alice@acme.com",
      firstName: "Alice",
      lastName: "Smith",
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.groups).toEqual([])
  })

  it("handles array email attribute (picks first)", () => {
    const mapping = IDP_PRESETS.okta.attributeMapping
    const assertion: SamlAssertionAttributes = {
      email: ["alice@acme.com", "alice.backup@acme.com"],
      firstName: "Alice",
      lastName: "Smith",
      groups: [],
    }
    const result = mapSamlAttributes(assertion, mapping)
    expect(result.email).toBe("alice@acme.com")
  })
})

// ─── Group → role resolution ─────────────────────────────────────────────────

describe("resolveRoleFromGroups", () => {
  const groupMapping = {
    Admins: "admin",
    Advisors: "assistant",
    Clients: "client",
  }

  it("resolves admin role from Admins group", () => {
    expect(resolveRoleFromGroups(["Admins"], groupMapping, "client")).toBe("admin")
  })

  it("resolves assistant role from Advisors group", () => {
    expect(resolveRoleFromGroups(["Advisors"], groupMapping, "client")).toBe("assistant")
  })

  it("resolves first matching group when user has multiple", () => {
    expect(resolveRoleFromGroups(["Admins", "Advisors"], groupMapping, "client")).toBe("admin")
  })

  it("falls back to default role when no groups match", () => {
    expect(resolveRoleFromGroups(["Engineering"], groupMapping, "client")).toBe("client")
  })

  it("falls back to default role when groups are empty", () => {
    expect(resolveRoleFromGroups([], groupMapping, "assistant")).toBe("assistant")
  })

  it("handles empty group mapping", () => {
    expect(resolveRoleFromGroups(["Admins"], {}, "client")).toBe("client")
  })
})
