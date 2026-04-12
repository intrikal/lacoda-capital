import { describe, it, expect } from "vitest"
import { contactFormSchema, demoFormSchema } from "@/lib/validations/contact.schema"

// ============================================================================
// contactFormSchema
// ============================================================================

describe("contactFormSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts a valid complete payload", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      company: "Acme Capital",
      subject: "Partnership inquiry",
      reason: "general",
      message: "I am interested in learning more about your wealth management services.",
    })
    expect(result.success).toBe(true)
  })

  it("accepts minimal payload (only required fields)", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(true)
  })

  // ── Missing required fields ────────────────────────────────────────────────

  it("rejects missing firstName", () => {
    const result = contactFormSchema.safeParse({
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing lastName", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      email: "jane@example.com",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing email", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing subject", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing message", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
    })
    expect(result.success).toBe(false)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects invalid email format", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "not-an-email",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-string firstName", () => {
    const result = contactFormSchema.safeParse({
      firstName: 123,
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  // ── Boundary values ────────────────────────────────────────────────────────

  it("rejects empty string firstName", () => {
    const result = contactFormSchema.safeParse({
      firstName: "",
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string lastName", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "",
      email: "jane@example.com",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string subject", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      subject: "",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects message under 10 characters", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
      message: "Too short",
    })
    expect(result.success).toBe(false)
  })

  it("accepts message at exactly 10 characters", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
      message: "1234567890",
    })
    expect(result.success).toBe(true)
  })

  it("rejects firstName over 100 characters", () => {
    const result = contactFormSchema.safeParse({
      firstName: "A".repeat(101),
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects subject over 300 characters", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      subject: "A".repeat(301),
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects message over 5000 characters", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
      message: "A".repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it("company and reason are optional", () => {
    const result = contactFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      subject: "Quick question",
      message: "I have a question about your services.",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.company).toBeUndefined()
      expect(result.data.reason).toBeUndefined()
    }
  })
})

// ============================================================================
// demoFormSchema
// ============================================================================

describe("demoFormSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts a valid complete payload", () => {
    const result = demoFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      company: "Acme Capital",
      aum: "$50M-$100M",
      role: "COO",
      preferredDate: "2024-02-15",
      preferredTime: "10:00 AM",
    })
    expect(result.success).toBe(true)
  })

  it("accepts minimal payload (only required fields)", () => {
    const result = demoFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      company: "Acme Capital",
    })
    expect(result.success).toBe(true)
  })

  // ── Missing required fields ────────────────────────────────────────────────

  it("rejects missing firstName", () => {
    const result = demoFormSchema.safeParse({
      lastName: "Smith",
      email: "jane@example.com",
      company: "Acme Capital",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing lastName", () => {
    const result = demoFormSchema.safeParse({
      firstName: "Jane",
      email: "jane@example.com",
      company: "Acme Capital",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing email", () => {
    const result = demoFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      company: "Acme Capital",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing company", () => {
    const result = demoFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
    })
    expect(result.success).toBe(false)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects invalid email format", () => {
    const result = demoFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "bad-email",
      company: "Acme Capital",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-string firstName", () => {
    const result = demoFormSchema.safeParse({
      firstName: true,
      lastName: "Smith",
      email: "jane@example.com",
      company: "Acme Capital",
    })
    expect(result.success).toBe(false)
  })

  // ── Boundary values ────────────────────────────────────────────────────────

  it("rejects empty string firstName", () => {
    const result = demoFormSchema.safeParse({
      firstName: "",
      lastName: "Smith",
      email: "jane@example.com",
      company: "Acme Capital",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string company (required in demo form)", () => {
    const result = demoFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      company: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects company over 200 characters", () => {
    const result = demoFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      company: "A".repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it("optional fields can be omitted", () => {
    const result = demoFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      company: "Acme Capital",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.aum).toBeUndefined()
      expect(result.data.role).toBeUndefined()
      expect(result.data.preferredDate).toBeUndefined()
      expect(result.data.preferredTime).toBeUndefined()
    }
  })
})
