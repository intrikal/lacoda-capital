/**
 * Document Upload Security Boundaries
 *
 * Tests file upload validation at two layers:
 *   1. Zod schema validation (uploadDocumentSchema) — field-level rules
 *   2. Server action logic (uploadDocument) — extension blocklist, size limit
 *
 * Since uploadDocument hits the DB we can't call it directly, so we replicate
 * the key security checks inline (same logic as document.actions.ts:136-143).
 */

import { describe, it, expect } from "vitest"
import { uploadDocumentSchema } from "@/lib/validations/document.schema"
import { sanitizeKeyName } from "@/lib/api-key"

// ─── Helpers replicating server-action security checks ──────────────────────

/** Mirrors the extension blocklist in document.actions.ts uploadDocument() */
function isBlockedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return lower.endsWith(".exe") || lower.endsWith(".bat") || lower.endsWith(".sh")
}

/** Mirrors the size check in document.actions.ts uploadDocument() */
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

function isSizeAllowed(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE
}

// ─── Base valid input (reused across tests) ─────────────────────────────────

const validInput = {
  name: "Q4 Report",
  fileName: "q4-report.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
}

describe("Document upload security boundaries", () => {
  // ── 1. Executable MIME type — schema does NOT block MIME, action blocks ext
  it("upload with executable MIME type passes schema but extension check rejects .exe", () => {
    const result = uploadDocumentSchema.safeParse({
      ...validInput,
      mimeType: "application/x-executable",
      fileName: "malware.exe",
    })

    // Schema only validates string format/length — it accepts any MIME
    expect(result.success).toBe(true)

    // But the server action rejects .exe by extension
    expect(isBlockedExtension("malware.exe")).toBe(true)
  })

  // ── 2. .exe extension blocked by server action ──────────────────────────
  it("upload with .exe extension is rejected by the extension blocklist", () => {
    expect(isBlockedExtension("payload.exe")).toBe(true)
    expect(isBlockedExtension("PAYLOAD.EXE")).toBe(true) // case-insensitive
    expect(isBlockedExtension("sneaky.pdf.exe")).toBe(true)
  })

  // ── 3. Valid MIME (application/pdf) accepted ────────────────────────────
  it("upload with valid MIME type (application/pdf) is accepted", () => {
    const result = uploadDocumentSchema.safeParse(validInput)
    expect(result.success).toBe(true)
    expect(isBlockedExtension(validInput.fileName)).toBe(false)
  })

  // ── 4. Filename with path traversal ─────────────────────────────────────
  it("filename with path traversal is sanitized by sanitizeKeyName", () => {
    const maliciousName = "../../../etc/passwd.pdf"

    // Schema accepts it (it's a valid string under 255 chars)
    const result = uploadDocumentSchema.safeParse({
      ...validInput,
      fileName: maliciousName,
    })
    expect(result.success).toBe(true)

    // sanitizeKeyName strips slashes and dots-chains
    const sanitized = sanitizeKeyName(maliciousName)
    expect(sanitized).not.toContain("/")
    expect(sanitized).not.toContain("\\")
    expect(sanitized).not.toMatch(/\.\./)
  })

  // ── 5. Filename with null bytes ─────────────────────────────────────────
  it("filename with null bytes is sanitized by sanitizeKeyName", () => {
    const maliciousName = "file\x00.pdf"

    const result = uploadDocumentSchema.safeParse({
      ...validInput,
      fileName: maliciousName,
    })
    expect(result.success).toBe(true)

    // sanitizeKeyName strips non-word/non-whitespace/non-dash/non-dot chars
    const sanitized = sanitizeKeyName(maliciousName)
    expect(sanitized).not.toContain("\x00")
    expect(sanitized).not.toContain("%00")
  })

  // ── 6. File exceeding size limit ────────────────────────────────────────
  it("file exceeding 50MB size limit is rejected by schema with descriptive error", () => {
    const oversized = MAX_FILE_SIZE + 1

    const result = uploadDocumentSchema.safeParse({
      ...validInput,
      sizeBytes: oversized,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const sizeError = result.error.issues.find((i) => i.path.includes("sizeBytes"))
      expect(sizeError).toBeDefined()
      expect(sizeError!.message).toContain("50MB")
    }

    // Server action also rejects independently
    expect(isSizeAllowed(oversized)).toBe(false)
  })

  // ── Additional: .bat and .sh also blocked ───────────────────────────────
  it(".bat and .sh extensions are also blocked", () => {
    expect(isBlockedExtension("script.bat")).toBe(true)
    expect(isBlockedExtension("deploy.sh")).toBe(true)
    expect(isBlockedExtension("safe.pdf")).toBe(false)
    expect(isBlockedExtension("notes.txt")).toBe(false)
  })

  // ── Additional: empty filename rejected by schema ───────────────────────
  it("empty filename is rejected by schema", () => {
    const result = uploadDocumentSchema.safeParse({
      ...validInput,
      fileName: "",
    })
    expect(result.success).toBe(false)
  })
})
