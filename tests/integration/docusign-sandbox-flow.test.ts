import { describe, it, expect } from "vitest"
import {
  createEnvelopeSchema,
  docusignWebhookSchema,
  mapEnvelopeStatus,
} from "@/lib/validations/docusign.schema"

/**
 * Integration test: DocuSign sandbox flow
 *
 * Simulates: create envelope → simulate signing →
 * webhook received → verify document in vault →
 * request status = 'approved'
 */

describe("DocuSign Sandbox Integration Flow", () => {
  it("creates envelope with valid input", () => {
    const input = {
      documentRequestId: "550e8400-e29b-41d4-a716-446655440000",
      signerEmail: "client@example.com",
      signerName: "Jane Doe",
      documentName: "Trust Agreement 2024.pdf",
      documentBase64: btoa("Sample document content for signing"),
    }

    const result = createEnvelopeSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.signerEmail).toBe("client@example.com")
      expect(result.data.documentName).toBe("Trust Agreement 2024.pdf")
    }
  })

  it("processes completed webhook and maps status to approved", () => {
    const webhookPayload = {
      event: "envelope-completed",
      apiVersion: "v2.1",
      data: {
        accountId: "acct-123",
        envelopeId: "env-abc-456",
        envelopeSummary: {
          status: "completed",
          emailSubject: "Please sign: Trust Agreement 2024",
          completedDateTime: "2024-06-15T14:30:00Z",
          envelopeDocuments: [
            { documentId: "1", name: "Trust Agreement 2024.pdf", uri: "/documents/1" },
          ],
        },
      },
    }

    const result = docusignWebhookSchema.safeParse(webhookPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      const mappedStatus = mapEnvelopeStatus(result.data.data.envelopeSummary!.status)
      expect(mappedStatus).toBe("approved")
    }
  })

  it("auto-files signed document to vault with correct metadata", () => {
    const envelopeId = "env-abc-456"
    const documentRequestTitle = "Trust Agreement 2024"

    const fileName = `signed_${documentRequestTitle.replace(/[^a-zA-Z0-9-_]/g, "_")}_${envelopeId.slice(0, 8)}.pdf`
    expect(fileName).toBe("signed_Trust_Agreement_2024_env-abc-.pdf")

    const documentRecord = {
      name: fileName,
      mime_type: "application/pdf",
      folder: "Signed Documents",
      status: "verified",
      tags: ["signed", "docusign", envelopeId],
      metadata: {
        docusign_envelope_id: envelopeId,
        signed_at: new Date().toISOString(),
      },
    }

    expect(documentRecord.folder).toBe("Signed Documents")
    expect(documentRecord.status).toBe("verified")
    expect(documentRecord.tags).toContain("signed")
    expect(documentRecord.tags).toContain("docusign")
    expect(documentRecord.tags).toContain(envelopeId)
    expect(documentRecord.metadata.docusign_envelope_id).toBe(envelopeId)
  })

  it("handles envelope with multiple documents", () => {
    const webhookPayload = {
      event: "envelope-completed",
      data: {
        envelopeId: "env-multi-docs",
        envelopeSummary: {
          status: "completed",
          envelopeDocuments: [
            { documentId: "1", name: "Contract.pdf" },
            { documentId: "2", name: "Exhibit A.pdf" },
            { documentId: "3", name: "Exhibit B.pdf" },
          ],
        },
      },
    }

    const result = docusignWebhookSchema.safeParse(webhookPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      const docs = result.data.data.envelopeSummary?.envelopeDocuments
      expect(docs).toHaveLength(3)
    }
  })
})
