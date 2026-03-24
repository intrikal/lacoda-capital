import { describe, it, expect } from "vitest"
import {
  mapEnvelopeStatus,
  createEnvelopeSchema,
  docusignWebhookSchema,
} from "@/lib/validations/docusign.schema"

describe("DocuSign Envelope Status Mapping", () => {
  describe("mapEnvelopeStatus", () => {
    const testCases = [
      { input: "completed", expected: "approved" },
      { input: "declined", expected: "declined" },
      { input: "voided", expected: "expired" },
      { input: "sent", expected: "open" },
      { input: "delivered", expected: "open" },
      { input: "created", expected: "open" },
    ]

    for (const { input, expected } of testCases) {
      it(`maps "${input}" → "${expected}"`, () => {
        expect(mapEnvelopeStatus(input)).toBe(expected)
      })
    }

    it("returns open for unknown statuses", () => {
      expect(mapEnvelopeStatus("processing")).toBe("open")
      expect(mapEnvelopeStatus("timedOut")).toBe("open")
      expect(mapEnvelopeStatus("")).toBe("open")
    })

    it("handles mixed case", () => {
      expect(mapEnvelopeStatus("Completed")).toBe("approved")
      expect(mapEnvelopeStatus("VOIDED")).toBe("expired")
      expect(mapEnvelopeStatus("Declined")).toBe("declined")
    })
  })
})

describe("DocuSign Schema Validation", () => {
  describe("createEnvelopeSchema", () => {
    it("validates correct input", () => {
      const result = createEnvelopeSchema.safeParse({
        documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
        signerEmail: "john@example.com",
        signerName: "John Smith",
        documentName: "Trust Agreement 2024",
      })
      expect(result.success).toBe(true)
    })

    it("rejects invalid document request ID", () => {
      const result = createEnvelopeSchema.safeParse({
        documentRequestId: "not-a-uuid",
        signerEmail: "john@example.com",
        signerName: "John Smith",
        documentName: "Doc",
      })
      expect(result.success).toBe(false)
    })

    it("rejects invalid email", () => {
      const result = createEnvelopeSchema.safeParse({
        documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
        signerEmail: "not-an-email",
        signerName: "John Smith",
        documentName: "Doc",
      })
      expect(result.success).toBe(false)
    })

    it("rejects empty signer name", () => {
      const result = createEnvelopeSchema.safeParse({
        documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
        signerEmail: "john@example.com",
        signerName: "",
        documentName: "Doc",
      })
      expect(result.success).toBe(false)
    })

    it("rejects empty document name", () => {
      const result = createEnvelopeSchema.safeParse({
        documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
        signerEmail: "john@example.com",
        signerName: "John",
        documentName: "",
      })
      expect(result.success).toBe(false)
    })

    it("accepts optional base64 document", () => {
      const result = createEnvelopeSchema.safeParse({
        documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
        signerEmail: "john@example.com",
        signerName: "John",
        documentName: "Doc",
        documentBase64: btoa("test document content"),
      })
      expect(result.success).toBe(true)
    })
  })

  describe("docusignWebhookSchema", () => {
    it("validates a completed envelope event", () => {
      const result = docusignWebhookSchema.safeParse({
        event: "envelope-completed",
        data: {
          envelopeId: "abc-123-def-456",
          envelopeSummary: {
            status: "completed",
            emailSubject: "Please sign: Trust Agreement",
            completedDateTime: "2024-06-15T14:30:00Z",
          },
        },
      })
      expect(result.success).toBe(true)
    })

    it("validates a declined envelope event", () => {
      const result = docusignWebhookSchema.safeParse({
        event: "envelope-declined",
        data: {
          envelopeId: "abc-123-def-456",
          envelopeSummary: {
            status: "declined",
            declinedDateTime: "2024-06-15T14:30:00Z",
          },
        },
      })
      expect(result.success).toBe(true)
    })

    it("validates a voided envelope event", () => {
      const result = docusignWebhookSchema.safeParse({
        event: "envelope-voided",
        data: {
          envelopeId: "abc-123-def-456",
          envelopeSummary: {
            status: "voided",
            voidedDateTime: "2024-06-15T14:30:00Z",
          },
        },
      })
      expect(result.success).toBe(true)
    })

    it("rejects event without envelopeId", () => {
      const result = docusignWebhookSchema.safeParse({
        event: "envelope-completed",
        data: {},
      })
      expect(result.success).toBe(false)
    })

    it("accepts event with documents array", () => {
      const result = docusignWebhookSchema.safeParse({
        event: "envelope-completed",
        data: {
          envelopeId: "abc-123",
          envelopeSummary: {
            status: "completed",
            envelopeDocuments: [
              { documentId: "1", name: "Contract.pdf", uri: "/documents/1" },
            ],
          },
        },
      })
      expect(result.success).toBe(true)
    })
  })
})
