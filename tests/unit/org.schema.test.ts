import { describe, it, expect } from "vitest"
import {
  inviteOrgMemberSchema,
  updateOrgMemberRoleSchema,
  updateOrgSettingsSchema,
} from "@/lib/validations/org.schema"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("inviteOrgMemberSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = inviteOrgMemberSchema.safeParse({
      email: "alice@example.com",
      role: "assistant",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = inviteOrgMemberSchema.safeParse({
      email: "alice@example.com",
      role: "client",
      clientId: UUID,
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing email", () => {
    const result = inviteOrgMemberSchema.safeParse({ role: "admin" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email", () => {
    const result = inviteOrgMemberSchema.safeParse({
      email: "not-an-email",
      role: "admin",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing role", () => {
    const result = inviteOrgMemberSchema.safeParse({ email: "alice@example.com" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid role", () => {
    const result = inviteOrgMemberSchema.safeParse({
      email: "alice@example.com",
      role: "superadmin",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid roles", () => {
    for (const role of ["admin", "assistant", "client"]) {
      const result = inviteOrgMemberSchema.safeParse({
        email: "test@example.com",
        role,
      })
      expect(result.success).toBe(true)
    }
  })

  it("lowercases email", () => {
    const result = inviteOrgMemberSchema.safeParse({
      email: "Alice@Example.COM",
      role: "admin",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("alice@example.com")
    }
  })

  it("rejects email with leading/trailing whitespace (email validated before trim)", () => {
    const result = inviteOrgMemberSchema.safeParse({
      email: "  alice@example.com  ",
      role: "admin",
    })
    expect(result.success).toBe(false)
  })

  it("accepts null clientId", () => {
    const result = inviteOrgMemberSchema.safeParse({
      email: "alice@example.com",
      role: "admin",
      clientId: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid clientId uuid", () => {
    const result = inviteOrgMemberSchema.safeParse({
      email: "alice@example.com",
      role: "admin",
      clientId: "bad-uuid",
    })
    expect(result.success).toBe(false)
  })
})

describe("updateOrgMemberRoleSchema", () => {
  it("accepts a valid payload", () => {
    const result = updateOrgMemberRoleSchema.safeParse({ role: "admin" })
    expect(result.success).toBe(true)
  })

  it("rejects missing role", () => {
    const result = updateOrgMemberRoleSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects invalid role", () => {
    const result = updateOrgMemberRoleSchema.safeParse({ role: "owner" })
    expect(result.success).toBe(false)
  })

  it("accepts null clientId", () => {
    const result = updateOrgMemberRoleSchema.safeParse({ role: "client", clientId: null })
    expect(result.success).toBe(true)
  })
})

describe("updateOrgSettingsSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = updateOrgSettingsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = updateOrgSettingsSchema.safeParse({
      name: "Acme Wealth",
      timezone: "America/New_York",
      currency: "USD",
      logoUrl: "https://example.com/logo.png",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = updateOrgSettingsSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects name exceeding 255 characters", () => {
    const result = updateOrgSettingsSchema.safeParse({ name: "A".repeat(256) })
    expect(result.success).toBe(false)
  })

  it("rejects invalid logoUrl", () => {
    const result = updateOrgSettingsSchema.safeParse({ logoUrl: "not-a-url" })
    expect(result.success).toBe(false)
  })

  it("accepts null logoUrl", () => {
    const result = updateOrgSettingsSchema.safeParse({ logoUrl: null })
    expect(result.success).toBe(true)
  })

  it("trims name whitespace", () => {
    const result = updateOrgSettingsSchema.safeParse({ name: "  Acme  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Acme")
    }
  })
})
