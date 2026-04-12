import { describe, it, expect } from "vitest"
import { bookingRequestSchema } from "@/lib/validations/booking.schema"

describe("bookingRequestSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts a valid complete payload", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      company: "Acme Capital",
      reason: "Interested in portfolio management services for UHNW clients",
      slotId: "slot-2024-01-15-10am",
    })
    expect(result.success).toBe(true)
  })

  it("accepts minimal payload (no optional company)", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options for my family",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(true)
  })

  // ── Missing required fields ────────────────────────────────────────────────

  it("rejects missing name", () => {
    const result = bookingRequestSchema.safeParse({
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing email", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      reason: "Looking to discuss wealth management options",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing reason", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing slotId", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options",
    })
    expect(result.success).toBe(false)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects non-string name", () => {
    const result = bookingRequestSchema.safeParse({
      name: 42,
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email format", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "not-an-email",
      reason: "Looking to discuss wealth management options",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-string slotId", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options",
      slotId: 999,
    })
    expect(result.success).toBe(false)
  })

  // ── Boundary values ────────────────────────────────────────────────────────

  it("rejects empty string name", () => {
    const result = bookingRequestSchema.safeParse({
      name: "",
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string slotId", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options",
      slotId: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects reason under 10 characters", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      reason: "Too short",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(false)
  })

  it("accepts reason at exactly 10 characters", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      reason: "1234567890",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(true)
  })

  it("rejects name over 100 characters", () => {
    const result = bookingRequestSchema.safeParse({
      name: "A".repeat(101),
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects reason over 1000 characters", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      reason: "A".repeat(1001),
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(false)
  })

  it("trims whitespace from name", () => {
    const result = bookingRequestSchema.safeParse({
      name: "  Jane Smith  ",
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Jane Smith")
    }
  })

  it("company is optional and can be omitted", () => {
    const result = bookingRequestSchema.safeParse({
      name: "Jane Smith",
      email: "jane@example.com",
      reason: "Looking to discuss wealth management options",
      slotId: "slot-abc123",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.company).toBeUndefined()
    }
  })
})
