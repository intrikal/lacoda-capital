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
 * │ 3. The POST includes an X-DocuSign-Signature-1 header (HMAC-SHA256    │
 * │    base64) which we verify before processing                          │
 * │ 4. We match on envelope status and take action                        │
 * │                                                                        │
 * │ We test:                                                               │
 * │   • Missing X-DocuSign-Signature-1 header → 400                      │
 * │   • Missing DOCUSIGN_WEBHOOK_SECRET env var → 500                    │
 * │   • Invalid signature → 400                                           │
 * │   • Tampered body → 400                                               │
 * │   • Invalid JSON → 400                                                │
 * │   • Each envelope status (completed, declined, voided)                │
 * │   • Unknown status → 200 (acknowledge, don't crash)                  │
 * │   • Realistic DocuSign payloads with recipients                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   app/api/webhooks/docusign/route.ts — route handler under test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
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

// ─── Constants ─────────────────────────────────────────────────────────────

const TEST_WEBHOOK_SECRET = "test-docusign-webhook-secret"

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeHmac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64")
}

/** Build a request WITHOUT auto-signing (for testing missing/invalid headers). */
function makeUnsignedRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/webhooks/docusign", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  })
}

/** Build a request with a valid HMAC signature. */
function makeRequest(body: string): Request {
  return makeUnsignedRequest(body, {
    "x-docusign-signature-1": computeHmac(body, TEST_WEBHOOK_SECRET),
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

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DOCUSIGN_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ============================================================================
// 1. Signature verification — missing header, missing env, invalid, tampered
// ============================================================================

describe("DocuSign webhook — missing X-DocuSign-Signature-1 header", () => {
  it("returns 400 when X-DocuSign-Signature-1 header is absent", async () => {
    const body = makeDocuSignEvent("completed")
    const req = makeUnsignedRequest(body) // no signature header

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Missing")
  })
})

describe("DocuSign webhook — missing DOCUSIGN_WEBHOOK_SECRET", () => {
  it("returns 500 when DOCUSIGN_WEBHOOK_SECRET is not set", async () => {
    delete process.env.DOCUSIGN_WEBHOOK_SECRET

    const body = makeDocuSignEvent("completed")
    const req = makeUnsignedRequest(body, {
      "x-docusign-signature-1": "some-sig",
    })

    const res = await POST(req as never)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toContain("not configured")
  })
})

describe("DocuSign webhook — invalid signature", () => {
  it("returns 400 when signature does not match", async () => {
    const body = makeDocuSignEvent("completed")
    const req = makeUnsignedRequest(body, {
      "x-docusign-signature-1": "dGhpcyBpcyBub3QgYSB2YWxpZCBzaWduYXR1cmU=",
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid signature")
  })

  it("returns 400 when body has been tampered with after signing", async () => {
    const originalBody = makeDocuSignEvent("completed", { envelopeId: "env-original" })
    const validSig = computeHmac(originalBody, TEST_WEBHOOK_SECRET)
    const tamperedBody = makeDocuSignEvent("completed", { envelopeId: "env-tampered" })

    const req = makeUnsignedRequest(tamperedBody, {
      "x-docusign-signature-1": validSig,
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid signature")
  })
})

// ============================================================================
// 2. Invalid JSON → 400
// ============================================================================

describe("DocuSign webhook — invalid JSON", () => {
  it("returns 400 for malformed JSON", async () => {
    const body = "not json {{{"
    const req = makeUnsignedRequest(body, {
      "x-docusign-signature-1": computeHmac(body, TEST_WEBHOOK_SECRET),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain("Invalid JSON")
  })

  it("returns 400 for empty body", async () => {
    const body = ""
    const req = makeUnsignedRequest(body, {
      "x-docusign-signature-1": computeHmac(body, TEST_WEBHOOK_SECRET),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })
})

// ============================================================================
// 3. Envelope completed — all signers have signed
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
// 4. Envelope declined — a signer refused
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
// 5. Envelope voided — sender cancelled
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
// 6. Unknown / unhandled status → 200 (acknowledge, don't crash)
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
// 7. Realistic full DocuSign Connect payload
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
