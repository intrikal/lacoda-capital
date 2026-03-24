import { describe, it, expect } from "vitest"
import { emailDraftOutputSchema, buildEmailDraftPrompt } from "@/lib/agents/email-draft"
import type { EmailDraftContextData } from "@/lib/agents/email-draft"

/**
 * Unit tests for the email draft agent.
 *
 * Tests Zod schema validation and the context builder.
 * Key test: prompt must include correct deadline date, document type, and upload URL.
 */

describe("emailDraftOutputSchema", () => {
  it("validates a correct email draft output", () => {
    const valid = {
      subject: "Request: 2023 K-1 Form for Smith Family Trust",
      body: "Dear Mr. Johnson,\n\nI am writing to request the 2023 K-1 form for the Smith Family Trust.\n\nPlease upload the document by April 15, 2024 using this link: https://app.lacoda.capital/portal/upload/req-123\n\nBest regards,\nSarah",
      tone: "formal" as const,
    }

    const result = emailDraftOutputSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it("rejects empty subject", () => {
    const invalid = {
      subject: "",
      body: "Some body text",
      tone: "formal",
    }

    const result = emailDraftOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("rejects empty body", () => {
    const invalid = {
      subject: "Subject",
      body: "",
      tone: "formal",
    }

    const result = emailDraftOutputSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("accepts all valid tone values", () => {
    for (const tone of ["formal", "friendly", "urgent"] as const) {
      const result = emailDraftOutputSchema.safeParse({
        subject: "Test",
        body: "Test body",
        tone,
      })
      expect(result.success).toBe(true)
    }
  })

  it("defaults tone to formal when not provided", () => {
    const result = emailDraftOutputSchema.safeParse({
      subject: "Test",
      body: "Test body",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tone).toBe("formal")
    }
  })
})

describe("buildEmailDraftPrompt", () => {
  const testData: EmailDraftContextData = {
    contactName: "Bob Johnson",
    contactEmail: "bob@taxfirm.com",
    documentType: "K-1 Form",
    clientName: "Smith Family",
    entityName: "Smith Family Trust",
    assetName: "456 Oak Ave",
    deadline: "2024-04-15",
    uploadUrl: "https://app.lacoda.capital/portal/upload/req-123",
    additionalNotes: "Need the final version, not the draft",
    senderName: "Sarah",
    orgName: "Acme Wealth Management",
  }

  it("includes correct deadline date", () => {
    const prompt = buildEmailDraftPrompt(testData)
    expect(prompt).toContain("2024-04-15")
  })

  it("includes document type", () => {
    const prompt = buildEmailDraftPrompt(testData)
    expect(prompt).toContain("K-1 Form")
  })

  it("includes upload URL", () => {
    const prompt = buildEmailDraftPrompt(testData)
    expect(prompt).toContain("https://app.lacoda.capital/portal/upload/req-123")
  })

  it("includes contact name and email", () => {
    const prompt = buildEmailDraftPrompt(testData)
    expect(prompt).toContain("Bob Johnson")
    expect(prompt).toContain("bob@taxfirm.com")
  })

  it("includes client and entity context", () => {
    const prompt = buildEmailDraftPrompt(testData)
    expect(prompt).toContain("Smith Family")
    expect(prompt).toContain("Smith Family Trust")
    expect(prompt).toContain("456 Oak Ave")
  })

  it("includes additional notes", () => {
    const prompt = buildEmailDraftPrompt(testData)
    expect(prompt).toContain("Need the final version, not the draft")
  })

  it("includes sender info", () => {
    const prompt = buildEmailDraftPrompt(testData)
    expect(prompt).toContain("Sarah")
    expect(prompt).toContain("Acme Wealth Management")
  })

  it("handles missing optional fields", () => {
    const minimalData: EmailDraftContextData = {
      contactName: "Jane",
      contactEmail: "jane@example.com",
      documentType: "Tax Return",
      senderName: "Admin",
      orgName: "Test Org",
    }

    const prompt = buildEmailDraftPrompt(minimalData)
    expect(prompt).toContain("Jane")
    expect(prompt).toContain("Tax Return")
    expect(prompt).not.toContain("Client:")
    expect(prompt).not.toContain("Entity:")
    expect(prompt).not.toContain("Deadline:")
    expect(prompt).not.toContain("Upload URL:")
  })
})
