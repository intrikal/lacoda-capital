/**
 * XSS Prevention in User-Generated Content
 *
 * Tests that Zod validation schemas handle malicious HTML/JS payloads
 * safely. The schemas themselves use .trim() and length limits but do NOT
 * strip HTML — the rendering layer (React) auto-escapes. These tests
 * verify that:
 *   1. Payloads pass or fail validation as expected (length, format).
 *   2. The sanitizeKeyName utility strips non-word characters.
 *   3. Payloads that DO pass validation are strings (React escapes them).
 */

import { describe, it, expect } from "vitest"
import { createClientSchema } from "@/lib/validations/client.schema"
import { createAssetSchema } from "@/lib/validations/asset.schema"
import { createTaskSchema } from "@/lib/validations/task.schema"
import { sendMessageSchema } from "@/lib/validations/message.schema"
import { createEntitySchema } from "@/lib/validations/entity.schema"
import { createDocumentSchema } from "@/lib/validations/document.schema"
import { sanitizeKeyName } from "@/lib/api-key"

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Assert the parsed string contains no raw, unescaped script tags. */
function expectNoExecutableHtml(value: string) {
  // Lowercase comparison catches <SCRIPT>, <Script>, etc.
  const lower = value.toLowerCase()
  expect(lower).not.toMatch(/<script[\s>]/)
  expect(lower).not.toMatch(/javascript\s*:/)
  expect(lower).not.toMatch(/\bon\w+\s*=/)
}

describe("XSS prevention in user-generated content", () => {
  // ── 1. Client name with <script> tag ────────────────────────────────────
  it("client name with <script> tag passes Zod (React escapes on render)", () => {
    const payload = '<script>alert(1)</script>'
    const result = createClientSchema.safeParse({ displayName: payload })

    // Zod accepts the string — it's ≥2 chars and ≤120 chars
    expect(result.success).toBe(true)
    if (result.success) {
      // The value is stored as-is; React's JSX auto-escapes on render.
      // sanitizeKeyName (used for API key names) DOES strip it:
      const sanitized = sanitizeKeyName(result.data.displayName)
      expectNoExecutableHtml(sanitized)
    }
  })

  // ── 2. Asset name with HTML tags ────────────────────────────────────────
  it("asset name with HTML tags is accepted by Zod but sanitizeKeyName strips them", () => {
    const payload = '<b>Bold</b><img src=x onerror=alert(1)>'
    const result = createAssetSchema.safeParse({
      entityId: "00000000-0000-0000-0000-000000000001",
      name: payload,
      assetClass: "real_estate",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      const sanitized = sanitizeKeyName(result.data.name)
      expectNoExecutableHtml(sanitized)
      expect(sanitized).not.toContain("<")
      expect(sanitized).not.toContain(">")
    }
  })

  // ── 3. Task description with event handlers ─────────────────────────────
  it("task description with event handlers (onload, onerror) sanitized by sanitizeKeyName", () => {
    const payload = '<div onload="alert(1)" onerror="alert(2)">test</div>'
    const result = createTaskSchema.safeParse({
      title: "Legitimate task",
      description: payload,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      const sanitized = sanitizeKeyName(result.data.description!)
      expectNoExecutableHtml(sanitized)
      expect(sanitized).not.toContain("onload")
      expect(sanitized).not.toContain("onerror")
    }
  })

  // ── 4. Message content with <img onerror> ───────────────────────────────
  it("message content with <img src=x onerror=alert(1)> sanitized by sanitizeKeyName", () => {
    const payload = '<img src=x onerror=alert(1)>'
    const result = sendMessageSchema.safeParse({
      conversationId: "00000000-0000-0000-0000-000000000001",
      content: payload,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      const sanitized = sanitizeKeyName(result.data.content)
      expectNoExecutableHtml(sanitized)
      expect(sanitized).not.toContain("<img")
    }
  })

  // ── 5. Entity name with javascript: protocol ────────────────────────────
  it("entity name with javascript: protocol sanitized by sanitizeKeyName", () => {
    const payload = 'javascript:alert(document.cookie)'
    const result = createEntitySchema.safeParse({
      clientId: "00000000-0000-0000-0000-000000000001",
      name: payload,
      entityType: "llc",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      const sanitized = sanitizeKeyName(result.data.name)
      expectNoExecutableHtml(sanitized)
      // sanitizeKeyName strips colons and parens
      expect(sanitized).not.toContain(":")
      expect(sanitized).not.toContain("(")
    }
  })

  // ── 6. Document name with path traversal ────────────────────────────────
  it("document name with path traversal characters sanitized by sanitizeKeyName", () => {
    const payload = '../../etc/passwd'
    const result = createDocumentSchema.safeParse({
      name: payload,
      storagePath: "org/general/file.pdf",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      const sanitized = sanitizeKeyName(result.data.name)
      // sanitizeKeyName strips '/' so traversal breaks
      expect(sanitized).not.toContain("/")
      // The dots and filename remain but the path is broken
      expect(sanitized).not.toMatch(/\.\./)
    }
  })

  // ── Additional coverage: sanitizeKeyName strips all dangerous patterns ──
  it("sanitizeKeyName strips nested and encoded XSS vectors", () => {
    const vectors = [
      '<svg/onload=alert(1)>',
      '"><script>alert(1)</script>',
      "';alert(String.fromCharCode(88,83,83))//",
      '<iframe src="javascript:alert(1)">',
      '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>',
    ]

    for (const vector of vectors) {
      const sanitized = sanitizeKeyName(vector)
      expectNoExecutableHtml(sanitized)
      expect(sanitized).not.toContain("<")
      expect(sanitized).not.toContain(">")
      expect(sanitized).not.toContain('"')
      expect(sanitized).not.toContain("'")
    }
  })
})
