import { describe, it, expect } from "vitest"
import { updateUserProfileSchema } from "@/lib/validations/user.schema"

describe("updateUserProfileSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = updateUserProfileSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts a fully populated payload", () => {
    const result = updateUserProfileSchema.safeParse({
      fullName: "Alice Johnson",
      phone: "+1 555 000 0000",
      avatarUrl: "https://example.com/avatar.png",
      preferences: {
        theme: "dark",
        notifications: {
          email: true,
          inApp: true,
          taskReminders: false,
          documentAlerts: true,
        },
        dashboard: {
          defaultView: "overview",
          widgetLayout: { col1: "netWorth", col2: "tasks" },
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts partial update with fullName only", () => {
    const result = updateUserProfileSchema.safeParse({ fullName: "Bob" })
    expect(result.success).toBe(true)
  })

  it("rejects fullName exceeding 255 characters", () => {
    const result = updateUserProfileSchema.safeParse({ fullName: "A".repeat(256) })
    expect(result.success).toBe(false)
  })

  it("rejects phone exceeding 20 characters", () => {
    const result = updateUserProfileSchema.safeParse({ phone: "1".repeat(21) })
    expect(result.success).toBe(false)
  })

  it("accepts null phone", () => {
    const result = updateUserProfileSchema.safeParse({ phone: null })
    expect(result.success).toBe(true)
  })

  it("rejects invalid avatarUrl", () => {
    const result = updateUserProfileSchema.safeParse({ avatarUrl: "not-a-url" })
    expect(result.success).toBe(false)
  })

  it("accepts null avatarUrl", () => {
    const result = updateUserProfileSchema.safeParse({ avatarUrl: null })
    expect(result.success).toBe(true)
  })

  it("rejects invalid theme enum", () => {
    const result = updateUserProfileSchema.safeParse({
      preferences: { theme: "blue" },
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid theme values", () => {
    for (const theme of ["light", "dark", "system"]) {
      const result = updateUserProfileSchema.safeParse({
        preferences: { theme },
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts partial preferences with only notifications", () => {
    const result = updateUserProfileSchema.safeParse({
      preferences: { notifications: { email: false } },
    })
    expect(result.success).toBe(true)
  })

  it("accepts partial preferences with only dashboard", () => {
    const result = updateUserProfileSchema.safeParse({
      preferences: { dashboard: { defaultView: "clients" } },
    })
    expect(result.success).toBe(true)
  })

  it("trims fullName whitespace", () => {
    const result = updateUserProfileSchema.safeParse({ fullName: "  Alice  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe("Alice")
    }
  })

  it("trims phone whitespace", () => {
    const result = updateUserProfileSchema.safeParse({ phone: "  555-0100  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.phone).toBe("555-0100")
    }
  })
})
