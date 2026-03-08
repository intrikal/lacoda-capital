import { describe, it, expect } from "vitest"
import { createClientSchema, updateClientSchema } from "@/lib/validations/client.schema"

describe("createClientSchema", () => {
  it("accepts a valid minimal payload", () => {
    const result = createClientSchema.safeParse({ displayName: "Alice Johnson" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clientType).toBe("individual")
      expect(result.data.clientStatus).toBe("prospect")
    }
  })

  it("accepts a fully populated payload", () => {
    const result = createClientSchema.safeParse({
      displayName: "Brightstone Capital",
      email: "ops@brightstone.com",
      phone: "+1 555 000 0000",
      clientType: "institution",
      clientStatus: "active",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a name shorter than 2 characters", () => {
    const result = createClientSchema.safeParse({ displayName: "A" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.displayName).toBeDefined()
    }
  })

  it("rejects a name longer than 120 characters", () => {
    const result = createClientSchema.safeParse({
      displayName: "A".repeat(121),
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid email", () => {
    const result = createClientSchema.safeParse({
      displayName: "Alice",
      email: "not-an-email",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    }
  })

  it("accepts null email (optional)", () => {
    const result = createClientSchema.safeParse({
      displayName: "Alice",
      email: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid clientType", () => {
    const result = createClientSchema.safeParse({
      displayName: "Alice",
      clientType: "corporation", // not in enum
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid clientStatus", () => {
    const result = createClientSchema.safeParse({
      displayName: "Alice",
      clientStatus: "pending", // not in enum
    })
    expect(result.success).toBe(false)
  })

  it("trims leading/trailing whitespace from displayName", () => {
    const result = createClientSchema.safeParse({ displayName: "  Alice  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayName).toBe("Alice")
    }
  })
})

describe("updateClientSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = updateClientSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts a partial update with only displayName", () => {
    const result = updateClientSchema.safeParse({ displayName: "Bob" })
    expect(result.success).toBe(true)
  })

  it("rejects a partial update with invalid email", () => {
    const result = updateClientSchema.safeParse({ email: "bad" })
    expect(result.success).toBe(false)
  })
})
