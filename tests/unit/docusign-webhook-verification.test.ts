import { describe, it, expect } from "vitest"
import {
  verifyDocuSignSignature,
  mapEnvelopeStatus,
  DOCUSIGN_STATUS_MAP,
} from "@/lib/validations/docusign.schema"

describe("DocuSign Webhook Signature Verification", () => {
  const testSecret = "test-hmac-secret-key-12345"

  async function computeHmac(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
    return btoa(String.fromCharCode(...new Uint8Array(sig)))
  }

  it("accepts valid signature", async () => {
    const payload = '{"event":"envelope-completed","data":{"envelopeId":"abc-123"}}'
    const validSignature = await computeHmac(payload, testSecret)

    const result = await verifyDocuSignSignature(payload, validSignature, testSecret)
    expect(result).toBe(true)
  })

  it("rejects invalid signature", async () => {
    const payload = '{"event":"envelope-completed"}'
    const invalidSignature = "this-is-not-a-valid-signature"

    const result = await verifyDocuSignSignature(payload, invalidSignature, testSecret)
    expect(result).toBe(false)
  })

  it("rejects tampered payload", async () => {
    const originalPayload = '{"event":"envelope-completed","data":{"envelopeId":"abc-123"}}'
    const validSignature = await computeHmac(originalPayload, testSecret)

    const tamperedPayload = '{"event":"envelope-completed","data":{"envelopeId":"xyz-999"}}'
    const result = await verifyDocuSignSignature(tamperedPayload, validSignature, testSecret)
    expect(result).toBe(false)
  })

  it("rejects wrong secret", async () => {
    const payload = '{"event":"envelope-completed"}'
    const signatureWithCorrectSecret = await computeHmac(payload, testSecret)

    const result = await verifyDocuSignSignature(payload, signatureWithCorrectSecret, "wrong-secret")
    expect(result).toBe(false)
  })

  it("handles empty payload", async () => {
    const signature = await computeHmac("", testSecret)
    const result = await verifyDocuSignSignature("", signature, testSecret)
    expect(result).toBe(true)
  })

  it("handles large payload", async () => {
    const largePayload = JSON.stringify({ data: "x".repeat(100000) })
    const signature = await computeHmac(largePayload, testSecret)
    const result = await verifyDocuSignSignature(largePayload, signature, testSecret)
    expect(result).toBe(true)
  })
})

describe("DocuSign Envelope Status Mapping", () => {
  it("maps completed → approved", () => {
    expect(mapEnvelopeStatus("completed")).toBe("approved")
  })

  it("maps declined → declined", () => {
    expect(mapEnvelopeStatus("declined")).toBe("declined")
  })

  it("maps voided → expired", () => {
    expect(mapEnvelopeStatus("voided")).toBe("expired")
  })

  it("maps sent → open", () => {
    expect(mapEnvelopeStatus("sent")).toBe("open")
  })

  it("maps delivered → open", () => {
    expect(mapEnvelopeStatus("delivered")).toBe("open")
  })

  it("maps created → open", () => {
    expect(mapEnvelopeStatus("created")).toBe("open")
  })

  it("handles case-insensitive status", () => {
    expect(mapEnvelopeStatus("Completed")).toBe("approved")
    expect(mapEnvelopeStatus("DECLINED")).toBe("declined")
    expect(mapEnvelopeStatus("Voided")).toBe("expired")
  })

  it("returns open for unknown status", () => {
    expect(mapEnvelopeStatus("unknown_status")).toBe("open")
  })

  it("DOCUSIGN_STATUS_MAP contains all expected mappings", () => {
    expect(DOCUSIGN_STATUS_MAP.completed).toBe("approved")
    expect(DOCUSIGN_STATUS_MAP.declined).toBe("declined")
    expect(DOCUSIGN_STATUS_MAP.voided).toBe("expired")
    expect(DOCUSIGN_STATUS_MAP.sent).toBe("open")
    expect(DOCUSIGN_STATUS_MAP.delivered).toBe("open")
    expect(DOCUSIGN_STATUS_MAP.created).toBe("open")
  })
})
