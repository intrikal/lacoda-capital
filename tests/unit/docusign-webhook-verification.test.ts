/**
 * ============================================================================
 * TEST FILE: docusign-webhook-verification.test.ts
 * ============================================================================
 *
 * Kevin, these tests cover the security layer that sits in front of our
 * DocuSign webhook endpoint.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHY VERIFY WEBHOOKS?                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Our webhook endpoint at /api/webhooks/docusign is a public URL.         │
 * │ Anyone on the internet can POST to it.                                  │
 * │                                                                         │
 * │ Without verification, an attacker could:                                │
 * │   • Fake a "completed" event → fraudulently mark docs as signed        │
 * │   • Fake a "voided" event → cancel legitimate envelopes                │
 * │   • Replay old events → trigger duplicate notifications                 │
 * │                                                                         │
 * │ DocuSign uses HMAC-SHA256 to sign each webhook payload:                │
 * │   1. DocuSign computes: HMAC_SHA256(secretKey, rawBody)                │
 * │   2. DocuSign sends the signature in the "X-DocuSign-Signature-1"     │
 * │      request header                                                     │
 * │   3. Our server recomputes the HMAC and compares                        │
 * │   4. If they match → the request is genuinely from DocuSign            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS HMAC-SHA256?                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ HMAC = Hash-based Message Authentication Code                          │
 * │ SHA256 = the hashing algorithm used                                     │
 * │                                                                         │
 * │ Think of it as a tamper-proof seal:                                     │
 * │   - Both sides share a secret key                                       │
 * │   - The sender mixes key + message through SHA256                       │
 * │   - Any change to the message produces a completely different hash      │
 * │   - Without the secret key you can't forge a valid signature            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/docusign.ts — DOCUSIGN_WEBHOOK_SECRET env var
 *   app/api/webhooks/docusign/route.ts — endpoint that uses this verification
 */

import { describe, it, expect } from "vitest"
import { createHmac, timingSafeEqual } from "crypto"

// ─── Webhook Verification Function ──────────────────────────────────────────
//
// This is the pure verification logic we're testing. In production it lives
// in the API route handler. Keeping it as a pure function makes it easy to
// test without spinning up HTTP servers.

function verifyDocuSignWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
  webhookSecret: string,
): boolean {
  // Guard: missing header → definitely not from DocuSign
  if (!signatureHeader) return false

  // Guard: empty body → nothing to verify
  if (!rawBody) return false

  // Guard: no secret configured → can't verify, fail closed
  if (!webhookSecret) return false

  try {
    // Compute our own HMAC of the raw body using the shared secret
    const expected = createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("base64")

    // timingSafeEqual prevents timing attacks:
    // A naive === comparison can leak information because it short-circuits
    // on the first mismatched character. timingSafeEqual always takes the
    // same amount of time regardless of where the mismatch occurs.
    const expectedBuf = Buffer.from(expected)
    const receivedBuf = Buffer.from(signatureHeader)

    if (expectedBuf.length !== receivedBuf.length) return false

    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

// ─── Test Helpers ────────────────────────────────────────────────────────────

const SECRET = "test-webhook-secret-32-chars-min!"

/** Build a valid base64-encoded HMAC signature for the given body. */
function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64")
}

const SAMPLE_BODY = JSON.stringify({
  event: "envelope-completed",
  envelopeId: "abc-123",
  status: "completed",
})

// ============================================================================
// 1. Valid signature — should pass
// ============================================================================

describe("verifyDocuSignWebhook — valid signatures", () => {
  it("accepts a correctly signed payload", () => {
    const sig = sign(SAMPLE_BODY)
    expect(verifyDocuSignWebhook(SAMPLE_BODY, sig, SECRET)).toBe(true)
  })

  it("accepts a payload with unicode characters in the body", () => {
    const body = JSON.stringify({ signerName: "François Müller" })
    const sig = sign(body)
    expect(verifyDocuSignWebhook(body, sig, SECRET)).toBe(true)
  })

  it("accepts a minimal single-field JSON body", () => {
    const body = '{"status":"completed"}'
    const sig = sign(body)
    expect(verifyDocuSignWebhook(body, sig, SECRET)).toBe(true)
  })

  it("accepts a large payload (simulates a multi-document envelope)", () => {
    const body = JSON.stringify({
      envelopes: Array.from({ length: 100 }, (_, i) => ({
        id: `env-${i}`,
        status: "sent",
        signers: [{ email: `signer${i}@example.com` }],
      })),
    })
    const sig = sign(body)
    expect(verifyDocuSignWebhook(body, sig, SECRET)).toBe(true)
  })
})

// ============================================================================
// 2. Invalid signature — should reject
// ============================================================================

describe("verifyDocuSignWebhook — invalid signatures", () => {
  it("rejects a signature computed with a DIFFERENT secret", () => {
    const sig = sign(SAMPLE_BODY, "wrong-secret")
    expect(verifyDocuSignWebhook(SAMPLE_BODY, sig, SECRET)).toBe(false)
  })

  it("rejects a signature for a DIFFERENT body (tampered payload)", () => {
    const tamperedBody = JSON.stringify({ status: "completed", injected: true })
    const sigForOriginal = sign(SAMPLE_BODY)
    expect(verifyDocuSignWebhook(tamperedBody, sigForOriginal, SECRET)).toBe(false)
  })

  it("rejects a hex-encoded signature (DocuSign uses base64)", () => {
    const hexSig = createHmac("sha256", SECRET).update(SAMPLE_BODY, "utf8").digest("hex")
    expect(verifyDocuSignWebhook(SAMPLE_BODY, hexSig, SECRET)).toBe(false)
  })

  it("rejects a signature that is all zeros", () => {
    const zeroSig = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    expect(verifyDocuSignWebhook(SAMPLE_BODY, zeroSig, SECRET)).toBe(false)
  })

  it("rejects a signature that is one character off", () => {
    const sig = sign(SAMPLE_BODY)
    // Flip the first character
    const corrupted = (sig[0] === "A" ? "B" : "A") + sig.slice(1)
    expect(verifyDocuSignWebhook(SAMPLE_BODY, corrupted, SECRET)).toBe(false)
  })

  it("rejects a random base64 string", () => {
    expect(verifyDocuSignWebhook(SAMPLE_BODY, "dGhpcyBpcyBub3QgYSB2YWxpZCBzaWduYXR1cmU=", SECRET)).toBe(false)
  })
})

// ============================================================================
// 3. Missing or empty signature header
// ============================================================================

describe("verifyDocuSignWebhook — missing signature header", () => {
  it("rejects when header is null", () => {
    expect(verifyDocuSignWebhook(SAMPLE_BODY, null, SECRET)).toBe(false)
  })

  it("rejects when header is undefined", () => {
    expect(verifyDocuSignWebhook(SAMPLE_BODY, undefined, SECRET)).toBe(false)
  })

  it("rejects when header is an empty string", () => {
    expect(verifyDocuSignWebhook(SAMPLE_BODY, "", SECRET)).toBe(false)
  })
})

// ============================================================================
// 4. Empty or missing body
// ============================================================================

describe("verifyDocuSignWebhook — empty body", () => {
  it("rejects an empty string body", () => {
    const sig = sign("")
    expect(verifyDocuSignWebhook("", sig, SECRET)).toBe(false)
  })

  it("does NOT throw on empty body — returns false cleanly", () => {
    expect(() => verifyDocuSignWebhook("", sign(""), SECRET)).not.toThrow()
  })
})

// ============================================================================
// 5. Missing webhook secret (misconfiguration)
// ============================================================================

describe("verifyDocuSignWebhook — missing webhook secret", () => {
  it("rejects all requests when webhookSecret is empty string", () => {
    const sig = sign(SAMPLE_BODY, "")
    // Even a "correct" signature for empty-secret should be rejected,
    // because an empty secret means we are misconfigured.
    expect(verifyDocuSignWebhook(SAMPLE_BODY, sig, "")).toBe(false)
  })
})

// ============================================================================
// 6. Signature encoding edge cases
// ============================================================================

describe("verifyDocuSignWebhook — encoding edge cases", () => {
  it("rejects a URL-safe base64 variant (+ vs -, / vs _)", () => {
    const sig = sign(SAMPLE_BODY)
    // Convert standard base64 to URL-safe base64
    const urlSafe = sig.replace(/\+/g, "-").replace(/\//g, "_")
    // Only worth testing if the conversion actually changed the string
    if (urlSafe !== sig) {
      expect(verifyDocuSignWebhook(SAMPLE_BODY, urlSafe, SECRET)).toBe(false)
    }
  })

  it("rejects a signature with leading/trailing whitespace", () => {
    const sig = sign(SAMPLE_BODY)
    expect(verifyDocuSignWebhook(SAMPLE_BODY, `  ${sig}  `, SECRET)).toBe(false)
  })

  it("is case-sensitive (base64 is case-sensitive)", () => {
    const sig = sign(SAMPLE_BODY)
    const uppercased = sig.toUpperCase()
    // Only test if uppercasing actually changes the signature
    if (uppercased !== sig) {
      expect(verifyDocuSignWebhook(SAMPLE_BODY, uppercased, SECRET)).toBe(false)
    }
  })
})

// ============================================================================
// 7. Idempotency — same inputs always produce same result
// ============================================================================

describe("verifyDocuSignWebhook — deterministic behavior", () => {
  it("returns the same result when called twice with identical inputs", () => {
    const sig = sign(SAMPLE_BODY)
    const first = verifyDocuSignWebhook(SAMPLE_BODY, sig, SECRET)
    const second = verifyDocuSignWebhook(SAMPLE_BODY, sig, SECRET)
    expect(first).toBe(second)
  })

  it("always returns a boolean, never throws on malformed input", () => {
    const badInputs = [
      { body: SAMPLE_BODY, sig: "not-base64!!!", secret: SECRET },
      { body: SAMPLE_BODY, sig: "====", secret: SECRET },
      { body: SAMPLE_BODY, sig: null as unknown as string, secret: SECRET },
    ]

    for (const { body, sig, secret } of badInputs) {
      expect(() => verifyDocuSignWebhook(body, sig, secret)).not.toThrow()
      expect(typeof verifyDocuSignWebhook(body, sig, secret)).toBe("boolean")
    }
  })
})
