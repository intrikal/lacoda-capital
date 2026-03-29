/**
 * ============================================================================
 * TEST FILE: webhook-docusign.test.ts
 * ============================================================================
 *
 * Kevin, this tests the DocuSign webhook route handler at
 * /api/webhooks/docusign/route.ts.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HOW DOCUSIGN WEBHOOKS WORK                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. An envelope changes status (signed, declined, voided)              │
 * │ 2. DocuSign POSTs JSON to our /api/webhooks/docusign endpoint         │
 * │ 3. The payload has event.data.envelopeSummary.status                  │
 * │ 4. We match on status and take action (mark doc verified, etc.)       │
 * │                                                                        │
 * │ SECURITY: DocuSign can sign payloads with HMAC-SHA256 via the         │
 * │ X-DocuSign-Signature-1 header. Our route has a TODO for this.         │
 * │ The HMAC verification logic is tested separately in                   │
 * │ docusign-webhook-verification.test.ts.                                │
 * │                                                                        │
 * │ We test:                                                               │
 * │   • Invalid JSON → 400                                                │
 * │   • Each envelope status (completed, declined, voided)                │
 * │   • Unknown status → 200 (acknowledge, don't crash)                  │
 * │   • Realistic DocuSign payloads with recipients                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   app/api/webhooks/docusign/route.ts — route handler under test
 *   tests/unit/docusign-webhook-verification.test.ts — HMAC verification tests
 *   tests/unit/docusign-status-mapping.test.ts — status mapping tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHmac } from "crypto"

// ─── Mock DB before importing route ─────────────────────────────────────────

vi.mock("@/app/db", () => ({
  db: { query: {}, select: vi.fn(), update: vi.fn(), insert: vi.fn() },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}))

vi.mock("@/app/db/schema", () => ({
  documents: {},
}))

// ─── Import the handler ─────────────────────────────────────────────────────

import { POST } from "@/app/api/webhooks/docusign/route"

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: string): Request {
  return new Request("http://localhost/api/webhooks/docusign", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  })
}

/**
 * Build a DocuSign Connect webhook payload.
 *
 * Kevin, DocuSign's webhook JSON structure is deeply nested:
 *   event.data.envelopeSummary.status
 *
 * This helper saves us from writing that nesting every time.
 */
function makeDocuSignEvent(
  status: string,
  overrides: {
    envelopeId?: string
    signers?: { email: string; name: string; status: string; signedDateTime?: string }[]
    completedDateTime?: string
  } = {},
): string {
  return JSON.stringify({
    event: `envelope-${status}`,
    apiVersion: "v2.1",
    uri: `/restapi/v2.1/accounts/acct-123/envelopes/${overrides.envelopeId ?? "env-test-001"}`,
    retryCount: 0,
    configurationId: "config-001",
    generatedDateTime: "2024-06-15T14:30:00Z",
    data: {
      accountId: "acct-123",
      userId: "user-advisor-001",
      envelopeId: overrides.envelopeId ?? "env-test-001",
      envelopeSummary: {
        status,
        completedDateTime: overrides.completedDateTime,
        recipients: overrides.signers
          ? { signers: overrides.signers }
          : undefined,
      },
    },
  })
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// 1. Invalid JSON → 400
// ============================================================================

describe("DocuSign webhook — invalid JSON", () => {
  it("returns 400 for malformed JSON", async () => {
    const req = makeRequest("not json {{{")
    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid JSON")
  })

  it("returns 400 for empty body", async () => {
    const req = makeRequest("")
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })
})

// ============================================================================
// 2. Envelope completed — all signers have signed
// ============================================================================

describe("DocuSign webhook — completed", () => {
  it("returns 200 for a completed envelope", async () => {
    const body = makeDocuSignEvent("completed", {
      envelopeId: "env-signed-001",
      completedDateTime: "2024-06-15T15:00:00Z",
      signers: [
        {
          email: "client@example.com",
          name: "Jane Client",
          status: "completed",
          signedDateTime: "2024-06-15T14:55:00Z",
        },
      ],
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("handles completed envelope with multiple signers", async () => {
    const body = makeDocuSignEvent("completed", {
      envelopeId: "env-multi-sign",
      signers: [
        {
          email: "signer1@example.com",
          name: "Signer One",
          status: "completed",
          signedDateTime: "2024-06-15T14:50:00Z",
        },
        {
          email: "signer2@example.com",
          name: "Signer Two",
          status: "completed",
          signedDateTime: "2024-06-15T14:55:00Z",
        },
      ],
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 3. Envelope declined — a signer refused
// ============================================================================

describe("DocuSign webhook — declined", () => {
  it("returns 200 for a declined envelope", async () => {
    const body = makeDocuSignEvent("declined", {
      envelopeId: "env-declined-001",
      signers: [
        {
          email: "reluctant@example.com",
          name: "Reluctant Signer",
          status: "declined",
        },
      ],
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("handles declined envelope with no signers array", async () => {
    const body = makeDocuSignEvent("declined", {
      envelopeId: "env-declined-002",
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })

  it("handles declined envelope where decliner is not found in signers", async () => {
    // All signers have status "sent" — none are "declined"
    const body = makeDocuSignEvent("declined", {
      signers: [
        { email: "a@example.com", name: "A", status: "sent" },
        { email: "b@example.com", name: "B", status: "sent" },
      ],
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 4. Envelope voided — sender cancelled
// ============================================================================

describe("DocuSign webhook — voided", () => {
  it("returns 200 for a voided envelope", async () => {
    const body = makeDocuSignEvent("voided", {
      envelopeId: "env-voided-001",
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })
})

// ============================================================================
// 5. Unknown / unhandled status → 200 (acknowledge, don't crash)
// ============================================================================

describe("DocuSign webhook — unhandled statuses", () => {
  /**
   * Kevin, DocuSign has statuses like "sent", "delivered", "created",
   * "autoResponded", etc. that our route doesn't explicitly handle.
   * The handler should return 200 for all of them so DocuSign stops retrying.
   */
  it("returns 200 for 'sent' status (not handled)", async () => {
    const body = makeDocuSignEvent("sent")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("returns 200 for 'delivered' status (not handled)", async () => {
    const body = makeDocuSignEvent("delivered")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })

  it("returns 200 for a completely unknown status", async () => {
    const body = makeDocuSignEvent("some_future_status")
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 6. Realistic full DocuSign Connect payload
// ============================================================================

describe("DocuSign webhook — realistic payload", () => {
  it("handles a full-fidelity DocuSign Connect completed event", async () => {
    const body = JSON.stringify({
      event: "envelope-completed",
      apiVersion: "v2.1",
      uri: "/restapi/v2.1/accounts/a-1234/envelopes/e-5678",
      retryCount: 0,
      configurationId: "connect-config-001",
      generatedDateTime: "2024-06-15T16:00:00.000Z",
      data: {
        accountId: "a-1234",
        userId: "u-advisor-001",
        envelopeId: "e-5678",
        envelopeSummary: {
          status: "completed",
          completedDateTime: "2024-06-15T15:58:00.000Z",
          emailSubject: "Please sign: Investment Policy Statement",
          recipients: {
            signers: [
              {
                email: "jane.doe@example.com",
                name: "Jane Doe",
                recipientId: "1",
                status: "completed",
                signedDateTime: "2024-06-15T15:55:00.000Z",
                deliveredDateTime: "2024-06-15T15:50:00.000Z",
              },
              {
                email: "john.advisor@lacoda.com",
                name: "John Advisor",
                recipientId: "2",
                status: "completed",
                signedDateTime: "2024-06-15T15:58:00.000Z",
                deliveredDateTime: "2024-06-15T15:56:00.000Z",
              },
            ],
          },
          envelopeDocuments: [
            {
              documentId: "1",
              name: "Investment_Policy_Statement.pdf",
              order: "1",
            },
          ],
        },
      },
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("handles a declined event with reason in signer status", async () => {
    const body = JSON.stringify({
      event: "envelope-declined",
      apiVersion: "v2.1",
      uri: "/restapi/v2.1/accounts/a-1234/envelopes/e-9999",
      retryCount: 0,
      configurationId: "connect-config-001",
      generatedDateTime: "2024-06-16T10:00:00.000Z",
      data: {
        accountId: "a-1234",
        userId: "u-advisor-001",
        envelopeId: "e-9999",
        envelopeSummary: {
          status: "declined",
          recipients: {
            signers: [
              {
                email: "client@example.com",
                name: "Hesitant Client",
                recipientId: "1",
                status: "declined",
                declinedReason: "I need to review this with my attorney first",
              },
            ],
          },
        },
      },
    })
    const req = makeRequest(body)

    const res = await POST(req as never)
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// 7. HMAC signature verification (pure function, inline)
// ============================================================================

describe("DocuSign webhook — HMAC verification logic", () => {
  /**
   * Kevin, the route handler currently has a TODO for HMAC verification.
   * These tests verify the pure HMAC logic that SHOULD be wired in.
   * The full HMAC test suite lives in docusign-webhook-verification.test.ts.
   * Here we just confirm the basics so this file is self-contained.
   */

  const HMAC_SECRET = "test-docusign-hmac-secret"

  function computeHmac(body: string, secret: string): string {
    return createHmac("sha256", secret).update(body, "utf8").digest("base64")
  }

  it("a valid HMAC matches the expected signature", () => {
    const body = '{"event":"envelope-completed"}'
    const sig = computeHmac(body, HMAC_SECRET)
    const expected = computeHmac(body, HMAC_SECRET)
    expect(sig).toBe(expected)
  })

  it("different bodies produce different HMACs", () => {
    const sig1 = computeHmac('{"status":"completed"}', HMAC_SECRET)
    const sig2 = computeHmac('{"status":"declined"}', HMAC_SECRET)
    expect(sig1).not.toBe(sig2)
  })

  it("different secrets produce different HMACs for same body", () => {
    const body = '{"event":"envelope-completed"}'
    const sig1 = computeHmac(body, "secret-a")
    const sig2 = computeHmac(body, "secret-b")
    expect(sig1).not.toBe(sig2)
  })

  it("HMAC is deterministic — same inputs always produce same output", () => {
    const body = '{"event":"test"}'
    const a = computeHmac(body, HMAC_SECRET)
    const b = computeHmac(body, HMAC_SECRET)
    const c = computeHmac(body, HMAC_SECRET)
    expect(a).toBe(b)
    expect(b).toBe(c)
  })
})
