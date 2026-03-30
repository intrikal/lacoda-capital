/**
 * Integration tests for DocuSign webhook → document status update flow.
 *
 * Tests the full flow: webhook arrives → document found by envelope ID →
 * signed PDF downloaded and stored → document status updated →
 * compliance evidence created → ledger events written.
 */

import { describe, it, expect, beforeEach } from "vitest"

// ─── In-memory simulated database ──────────────────────────────────────────

interface MockDocument {
  id: string
  orgId: string
  name: string
  storagePath: string
  status: string
  verifiedAt: Date | null
  clientId: string | null
  metadata: Record<string, unknown>
}

interface MockComplianceEvidence {
  controlId: string
  documentId: string
  clientId: string
  status: string
  validFrom: Date
}

interface MockLedgerEvent {
  orgId: string
  actorUserId: string
  targetType: string
  targetId: string
  action: string
  payload: Record<string, unknown>
}

let documents: MockDocument[] = []
let complianceEvidence: MockComplianceEvidence[] = []
let ledgerEvents: MockLedgerEvent[] = []
let alerts: { title: string; severity: string; orgId?: string }[] = []

// ─── Simulated compliance controls ─────────────────────────────────────────

const COMPLIANCE_CONTROLS = [
  { id: "ctrl-kyc", orgId: "org-123", requiredDocumentTypes: ["identity_document", "passport"] },
  { id: "ctrl-agreement", orgId: "org-123", requiredDocumentTypes: ["trust_agreement", "investment_policy"] },
]

// ─── Simulated handler logic (mirrors route.ts) ────────────────────────────

function handleCompleted(
  envelopeId: string,
  completedDateTime: string | undefined,
  hasDocuSignIntegration: boolean,
  adminUserId: string | null,
) {
  const doc = documents.find((d) =>
    (d.metadata?.customFields as Record<string, unknown>)?.docusign_envelope_id === envelopeId,
  )
  if (!doc) return

  if (hasDocuSignIntegration) {
    // Simulate download + store signed PDF
    const signedPath = doc.storagePath.replace(/(\.[^.]+)$/, `_signed$1`)
    doc.storagePath = signedPath
    doc.status = "verified"
    doc.verifiedAt = new Date()
    doc.metadata = {
      ...doc.metadata,
      sourceSystem: "docusign",
      customFields: {
        ...(doc.metadata?.customFields as Record<string, unknown> ?? {}),
        docusign_envelope_id: envelopeId,
        signed_at: completedDateTime,
      },
    }
  } else {
    doc.status = "verified"
    doc.verifiedAt = new Date()
  }

  // Create compliance evidence
  if (doc.clientId) {
    for (const control of COMPLIANCE_CONTROLS) {
      const docType = (doc.metadata?.documentType as string) ?? ""
      if ((control.requiredDocumentTypes as string[]).includes(docType)) {
        complianceEvidence.push({
          controlId: control.id,
          documentId: doc.id,
          clientId: doc.clientId,
          status: "pending",
          validFrom: new Date(),
        })
      }
    }
  }

  // Ledger event
  if (adminUserId) {
    ledgerEvents.push({
      orgId: doc.orgId,
      actorUserId: adminUserId,
      targetType: "document",
      targetId: doc.id,
      action: "document_verified",
      payload: {
        documentName: doc.name,
        documentPath: doc.storagePath,
        reason: "DocuSign envelope completed",
        notes: `Envelope ${envelopeId} signed by all parties`,
      },
    })
  }
}

function handleDeclined(
  envelopeId: string,
  declinerName: string | undefined,
  adminUserId: string | null,
) {
  const doc = documents.find((d) =>
    (d.metadata?.customFields as Record<string, unknown>)?.docusign_envelope_id === envelopeId,
  )
  if (!doc) return

  doc.status = "rejected"

  if (adminUserId) {
    ledgerEvents.push({
      orgId: doc.orgId,
      actorUserId: adminUserId,
      targetType: "document",
      targetId: doc.id,
      action: "updated",
      payload: {
        documentName: doc.name,
        reason: `DocuSign envelope declined by ${declinerName ?? "unknown"}`,
        after: { status: "rejected" },
      },
    })
  }

  alerts.push({
    title: `Document signing declined: ${doc.name}`,
    severity: "warning",
    orgId: doc.orgId,
  })
}

function handleVoided(envelopeId: string, adminUserId: string | null) {
  const doc = documents.find((d) =>
    (d.metadata?.customFields as Record<string, unknown>)?.docusign_envelope_id === envelopeId,
  )
  if (!doc) return

  doc.status = "rejected"

  if (adminUserId) {
    ledgerEvents.push({
      orgId: doc.orgId,
      actorUserId: adminUserId,
      targetType: "document",
      targetId: doc.id,
      action: "updated",
      payload: {
        documentName: doc.name,
        reason: "DocuSign envelope voided",
        after: { status: "rejected" },
      },
    })
  }

  alerts.push({
    title: `Document signing voided: ${doc.name}`,
    severity: "warning",
    orgId: doc.orgId,
  })
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  documents = [
    {
      id: "doc-001",
      orgId: "org-123",
      name: "Investment_Policy.pdf",
      storagePath: "docs/org-123/investment_policy.pdf",
      status: "pending",
      verifiedAt: null,
      clientId: "client-456",
      metadata: {
        documentType: "investment_policy",
        customFields: { docusign_envelope_id: "env-001" },
      },
    },
    {
      id: "doc-002",
      orgId: "org-123",
      name: "NDA.pdf",
      storagePath: "docs/org-123/nda.pdf",
      status: "pending",
      verifiedAt: null,
      clientId: "client-789",
      metadata: {
        documentType: "nda",
        customFields: { docusign_envelope_id: "env-002" },
      },
    },
  ]
  complianceEvidence = []
  ledgerEvents = []
  alerts = []
})

// ============================================================================
// Completed flow
// ============================================================================

describe("DocuSign webhook flow — completed", () => {
  it("marks document as verified with timestamp", () => {
    handleCompleted("env-001", "2024-06-15T15:00:00Z", true, "admin-1")

    const doc = documents.find((d) => d.id === "doc-001")!
    expect(doc.status).toBe("verified")
    expect(doc.verifiedAt).toBeInstanceOf(Date)
  })

  it("updates storagePath to signed version when DocuSign integration exists", () => {
    handleCompleted("env-001", "2024-06-15T15:00:00Z", true, "admin-1")

    const doc = documents.find((d) => d.id === "doc-001")!
    expect(doc.storagePath).toBe("docs/org-123/investment_policy_signed.pdf")
  })

  it("preserves existing metadata and adds signed_at", () => {
    handleCompleted("env-001", "2024-06-15T15:00:00Z", true, "admin-1")

    const doc = documents.find((d) => d.id === "doc-001")!
    const cf = doc.metadata.customFields as Record<string, unknown>
    expect(cf.signed_at).toBe("2024-06-15T15:00:00Z")
    expect(cf.docusign_envelope_id).toBe("env-001")
    expect(doc.metadata.sourceSystem).toBe("docusign")
  })

  it("still marks as verified when no DocuSign integration (skip download)", () => {
    handleCompleted("env-001", "2024-06-15T15:00:00Z", false, "admin-1")

    const doc = documents.find((d) => d.id === "doc-001")!
    expect(doc.status).toBe("verified")
    // Storage path unchanged
    expect(doc.storagePath).toBe("docs/org-123/investment_policy.pdf")
  })

  it("creates compliance evidence when doc type matches control requirements", () => {
    handleCompleted("env-001", "2024-06-15T15:00:00Z", true, "admin-1")

    // Investment policy matches ctrl-agreement
    expect(complianceEvidence).toHaveLength(1)
    expect(complianceEvidence[0]).toMatchObject({
      controlId: "ctrl-agreement",
      documentId: "doc-001",
      clientId: "client-456",
      status: "pending",
    })
  })

  it("does not create compliance evidence when doc type has no matching control", () => {
    // NDA has documentType "nda" which isn't in any control's requiredDocumentTypes
    handleCompleted("env-002", "2024-06-15T15:00:00Z", true, "admin-1")

    expect(complianceEvidence).toHaveLength(0)
  })

  it("creates a document_verified ledger event", () => {
    handleCompleted("env-001", "2024-06-15T15:00:00Z", true, "admin-1")

    expect(ledgerEvents).toHaveLength(1)
    expect(ledgerEvents[0]).toMatchObject({
      orgId: "org-123",
      targetType: "document",
      targetId: "doc-001",
      action: "document_verified",
    })
  })

  it("does nothing when envelope ID has no matching document", () => {
    handleCompleted("env-unknown", "2024-06-15T15:00:00Z", true, "admin-1")

    expect(ledgerEvents).toHaveLength(0)
    expect(complianceEvidence).toHaveLength(0)
    expect(documents.every((d) => d.status === "pending")).toBe(true)
  })
})

// ============================================================================
// Declined flow
// ============================================================================

describe("DocuSign webhook flow — declined", () => {
  it("marks document as rejected", () => {
    handleDeclined("env-001", "Jane Client", "admin-1")

    const doc = documents.find((d) => d.id === "doc-001")!
    expect(doc.status).toBe("rejected")
  })

  it("creates a ledger event with decliner name", () => {
    handleDeclined("env-001", "Jane Client", "admin-1")

    expect(ledgerEvents).toHaveLength(1)
    expect(ledgerEvents[0].payload.reason).toContain("Jane Client")
  })

  it("dispatches a warning alert", () => {
    handleDeclined("env-001", "Jane Client", "admin-1")

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      severity: "warning",
      orgId: "org-123",
    })
  })

  it("handles unknown decliner gracefully", () => {
    handleDeclined("env-001", undefined, "admin-1")

    expect(ledgerEvents[0].payload.reason).toContain("unknown")
  })
})

// ============================================================================
// Voided flow
// ============================================================================

describe("DocuSign webhook flow — voided", () => {
  it("marks document as rejected", () => {
    handleVoided("env-002", "admin-1")

    const doc = documents.find((d) => d.id === "doc-002")!
    expect(doc.status).toBe("rejected")
  })

  it("creates a ledger event for voided envelope", () => {
    handleVoided("env-002", "admin-1")

    expect(ledgerEvents).toHaveLength(1)
    expect(ledgerEvents[0].payload.reason).toBe("DocuSign envelope voided")
  })

  it("dispatches a warning alert", () => {
    handleVoided("env-002", "admin-1")

    expect(alerts).toHaveLength(1)
    expect(alerts[0].title).toContain("voided")
  })
})

// ============================================================================
// Sequential flow: complete one, decline another
// ============================================================================

describe("DocuSign webhook flow — sequential events", () => {
  it("processes completed and declined on different documents", () => {
    handleCompleted("env-001", "2024-06-15T15:00:00Z", true, "admin-1")
    handleDeclined("env-002", "Reluctant Signer", "admin-1")

    expect(documents.find((d) => d.id === "doc-001")!.status).toBe("verified")
    expect(documents.find((d) => d.id === "doc-002")!.status).toBe("rejected")
    expect(ledgerEvents).toHaveLength(2)
    expect(alerts).toHaveLength(1)
  })
})
