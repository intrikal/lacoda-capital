import { describe, it, expect } from "vitest"
import {
  createEnvelopeSchema,
  docusignWebhookSchema,
  mapEnvelopeStatus,
  DOCUSIGN_STATUS_MAP,
} from "@/lib/validations/docusign.schema"

// ============================================================================
// createEnvelopeSchema
// ============================================================================

describe("createEnvelopeSchema", () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────

  it("accepts a valid complete payload", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "signer@example.com",
      signerName: "John Doe",
      documentName: "Investment Agreement 2024",
      documentBase64: "SGVsbG8gV29ybGQ=",
      documentStoragePath: "documents/agreements/inv-2024.pdf",
    })
    expect(result.success).toBe(true)
  })

  it("accepts minimal payload (no optional document fields)", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "signer@example.com",
      signerName: "John Doe",
      documentName: "Investment Agreement 2024",
    })
    expect(result.success).toBe(true)
  })

  // ── Missing required fields ────────────────────────────────────────────────

  it("rejects missing documentRequestId", () => {
    const result = createEnvelopeSchema.safeParse({
      signerEmail: "signer@example.com",
      signerName: "John Doe",
      documentName: "Investment Agreement",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing signerEmail", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerName: "John Doe",
      documentName: "Investment Agreement",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing signerName", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "signer@example.com",
      documentName: "Investment Agreement",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing documentName", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "signer@example.com",
      signerName: "John Doe",
    })
    expect(result.success).toBe(false)
  })

  // ── Invalid types ──────────────────────────────────────────────────────────

  it("rejects non-UUID documentRequestId", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "not-a-uuid",
      signerEmail: "signer@example.com",
      signerName: "John Doe",
      documentName: "Investment Agreement",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid signerEmail format", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "not-an-email",
      signerName: "John Doe",
      documentName: "Investment Agreement",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-string signerName", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "signer@example.com",
      signerName: 42,
      documentName: "Investment Agreement",
    })
    expect(result.success).toBe(false)
  })

  // ── Boundary values ────────────────────────────────────────────────────────

  it("rejects empty string signerName", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "signer@example.com",
      signerName: "",
      documentName: "Investment Agreement",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string documentName", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "signer@example.com",
      signerName: "John Doe",
      documentName: "",
    })
    expect(result.success).toBe(false)
  })

  it("optional fields can be omitted", () => {
    const result = createEnvelopeSchema.safeParse({
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "signer@example.com",
      signerName: "John Doe",
      documentName: "Investment Agreement",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.documentBase64).toBeUndefined()
      expect(result.data.documentStoragePath).toBeUndefined()
    }
  })
})

// ============================================================================
// docusignWebhookSchema
// ============================================================================

describe("docusignWebhookSchema", () => {
  it("accepts a valid webhook event with full envelope summary", () => {
    const result = docusignWebhookSchema.safeParse({
      event: "envelope-completed",
      apiVersion: "v2.1",
      uri: "/restapi/v2.1/accounts/abc/envelopes/env-123",
      retryCount: 0,
      configurationId: "config-1",
      generatedDateTime: "2024-01-15T10:00:00Z",
      data: {
        accountId: "account-abc",
        userId: "user-xyz",
        envelopeId: "env-123",
        envelopeSummary: {
          status: "completed",
          emailSubject: "Please sign: Investment Agreement",
          sentDateTime: "2024-01-14T09:00:00Z",
          completedDateTime: "2024-01-15T10:00:00Z",
          recipients: { signers: [] },
          envelopeDocuments: [
            {
              documentId: "doc-1",
              name: "Investment Agreement.pdf",
              uri: "/documents/doc-1",
            },
          ],
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts minimal webhook event (only required fields)", () => {
    const result = docusignWebhookSchema.safeParse({
      event: "envelope-sent",
      data: {
        envelopeId: "env-456",
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing event", () => {
    const result = docusignWebhookSchema.safeParse({
      data: {
        envelopeId: "env-456",
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing data", () => {
    const result = docusignWebhookSchema.safeParse({
      event: "envelope-sent",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing data.envelopeId", () => {
    const result = docusignWebhookSchema.safeParse({
      event: "envelope-sent",
      data: {
        accountId: "account-abc",
      },
    })
    expect(result.success).toBe(false)
  })

  it("accepts webhook with no envelopeSummary (optional)", () => {
    const result = docusignWebhookSchema.safeParse({
      event: "envelope-created",
      data: {
        envelopeId: "env-789",
      },
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// mapEnvelopeStatus
// ============================================================================

describe("mapEnvelopeStatus", () => {
  it('maps "completed" to "approved"', () => {
    expect(mapEnvelopeStatus("completed")).toBe("approved")
  })

  it('maps "declined" to "declined"', () => {
    expect(mapEnvelopeStatus("declined")).toBe("declined")
  })

  it('maps "voided" to "expired"', () => {
    expect(mapEnvelopeStatus("voided")).toBe("expired")
  })

  it('maps "sent" to "open"', () => {
    expect(mapEnvelopeStatus("sent")).toBe("open")
  })

  it('maps "delivered" to "open"', () => {
    expect(mapEnvelopeStatus("delivered")).toBe("open")
  })

  it('maps "created" to "open"', () => {
    expect(mapEnvelopeStatus("created")).toBe("open")
  })

  it('maps unknown status to "open" (fail-safe default)', () => {
    expect(mapEnvelopeStatus("unknown_future_status")).toBe("open")
  })

  it("is case-insensitive", () => {
    expect(mapEnvelopeStatus("COMPLETED")).toBe("approved")
    expect(mapEnvelopeStatus("Declined")).toBe("declined")
  })

  it("handles empty string without throwing", () => {
    expect(() => mapEnvelopeStatus("")).not.toThrow()
    expect(mapEnvelopeStatus("")).toBe("open")
  })

  it("DOCUSIGN_STATUS_MAP contains all expected keys", () => {
    expect(DOCUSIGN_STATUS_MAP).toHaveProperty("completed", "approved")
    expect(DOCUSIGN_STATUS_MAP).toHaveProperty("declined", "declined")
    expect(DOCUSIGN_STATUS_MAP).toHaveProperty("voided", "expired")
    expect(DOCUSIGN_STATUS_MAP).toHaveProperty("sent", "open")
    expect(DOCUSIGN_STATUS_MAP).toHaveProperty("delivered", "open")
    expect(DOCUSIGN_STATUS_MAP).toHaveProperty("created", "open")
  })
})
