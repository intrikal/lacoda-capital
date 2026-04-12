/**
 * Unit tests for contact / demo form server actions.
 *
 * Tests:
 *   - submitContactForm happy path (DB insert)
 *   - submitContactForm validation failures
 *   - submitDemoForm happy path (DB insert)
 *   - submitDemoForm validation failure (missing company)
 *   - Email notification: called when SUPABASE URL is set
 *   - Email notification: skipped when SUPABASE URL is missing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mock the DB ─────────────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue([])

vi.mock("@/app/db", () => ({
  db: {
    insert: () => ({
      values: mockInsert,
    }),
  },
}))

vi.mock("@/app/db/schema", () => ({
  contactSubmissions: {},
}))

// ─── Mock fetch for edge-function email calls ─────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// ─── Import SUT after mocks are set up ───────────────────────────────────────

import { submitContactForm, submitDemoForm } from "@/lib/actions/contact.actions"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validContact = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  subject: "Hello there",
  message: "This is a test message that is long enough.",
}

const validDemo = {
  firstName: "John",
  lastName: "Smith",
  email: "john@company.com",
  company: "Acme Wealth",
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("submitContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue([])
    mockFetch.mockResolvedValue({ ok: true })
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.CONTACT_FORM_EMAIL
  })

  it("valid input → inserts row and returns success", async () => {
    const result = await submitContactForm(validContact)
    expect(result).toEqual({ success: true })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "contact",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      })
    )
  })

  it("invalid email → returns error without DB insert", async () => {
    const result = await submitContactForm({ ...validContact, email: "not-an-email" })
    expect(result).toEqual({ success: false, error: expect.any(String) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("missing firstName → returns error", async () => {
    const { firstName: _f, ...withoutFirst } = validContact
    const result = await submitContactForm(withoutFirst)
    expect(result).toEqual({ success: false, error: expect.any(String) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("missing subject → returns error", async () => {
    const result = await submitContactForm({ ...validContact, subject: "" })
    expect(result).toEqual({ success: false, error: expect.any(String) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("message too short → returns error", async () => {
    const result = await submitContactForm({ ...validContact, message: "short" })
    expect(result).toEqual({ success: false, error: expect.any(String) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("DB error → returns error", async () => {
    mockInsert.mockRejectedValueOnce(new Error("connection refused"))
    const result = await submitContactForm(validContact)
    expect(result).toEqual({ success: false, error: expect.any(String) })
  })

  describe("email notification", () => {
    it("calls edge function when SUPABASE URL and CONTACT_FORM_EMAIL are set", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co"
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
      process.env.CONTACT_FORM_EMAIL = "admin@example.com"
      mockFetch.mockResolvedValueOnce({ ok: true })

      const result = await submitContactForm(validContact)
      expect(result).toEqual({ success: true })
      expect(mockFetch).toHaveBeenCalledWith(
        "https://abc.supabase.co/functions/v1/send-email",
        expect.objectContaining({ method: "POST" })
      )
    })

    it("skips email silently when SUPABASE URL is missing", async () => {
      process.env.CONTACT_FORM_EMAIL = "admin@example.com"
      // No NEXT_PUBLIC_SUPABASE_URL set

      const result = await submitContactForm(validContact)
      expect(result).toEqual({ success: true })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("still returns success even when edge function call fails", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co"
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
      process.env.CONTACT_FORM_EMAIL = "admin@example.com"
      mockFetch.mockResolvedValueOnce({ ok: false, text: async () => "error" })

      const result = await submitContactForm(validContact)
      expect(result).toEqual({ success: true })
    })
  })
})

describe("submitDemoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue([])
    mockFetch.mockResolvedValue({ ok: true })
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.CONTACT_FORM_EMAIL
  })

  it("valid input → inserts row and returns success", async () => {
    const result = await submitDemoForm(validDemo)
    expect(result).toEqual({ success: true })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "demo",
        firstName: "John",
        lastName: "Smith",
        email: "john@company.com",
        company: "Acme Wealth",
      })
    )
  })

  it("missing company name → returns error", async () => {
    const { company: _c, ...withoutCompany } = validDemo
    const result = await submitDemoForm(withoutCompany)
    expect(result).toEqual({ success: false, error: expect.any(String) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("empty company name → returns error", async () => {
    const result = await submitDemoForm({ ...validDemo, company: "" })
    expect(result).toEqual({ success: false, error: expect.any(String) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("invalid email → returns error", async () => {
    const result = await submitDemoForm({ ...validDemo, email: "bad" })
    expect(result).toEqual({ success: false, error: expect.any(String) })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("optional fields are passed through when provided", async () => {
    const result = await submitDemoForm({
      ...validDemo,
      aum: "$10M–$50M",
      role: "CIO",
      preferredDate: "2024-03-15",
      preferredTime: "10:00 AM",
    })
    expect(result).toEqual({ success: true })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        aum: "$10M–$50M",
        role: "CIO",
        preferredDate: "2024-03-15",
        preferredTime: "10:00 AM",
      })
    )
  })

  it("calls edge function when SUPABASE URL and CONTACT_FORM_EMAIL are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    process.env.CONTACT_FORM_EMAIL = "admin@example.com"
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await submitDemoForm(validDemo)
    expect(result).toEqual({ success: true })
    expect(mockFetch).toHaveBeenCalled()
  })
})
