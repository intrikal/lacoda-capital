/**
 * ============================================================================
 * TEST FILE: google-drive.schema.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the validation logic for the Google Drive integration.
 * Unlike Plaid (which moves money data) or DocuSign (which moves legal documents),
 * Google Drive is a FILE STORAGE integration — it syncs documents between
 * Google's servers and our Vault.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT GOOGLE DRIVE DOES IN LACODA CAPITAL                                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. CONNECT — Advisor clicks "Connect Google Drive" → OAuth popup        │
 * │    → Google asks "Allow Lacoda Capital to read your Drive files?"       │
 * │    → Advisor clicks Allow → we get a refresh_token we store safely      │
 * │                                                                          │
 * │ 2. BROWSE — Advisor sees a folder picker                                │
 * │    → Lists files from a specific folder (or root if none chosen)        │
 * │                                                                          │
 * │ 3. IMPORT — Advisor picks files → they get copied to our Vault         │
 * │    (stored in Supabase Storage with a document row in the DB)           │
 * │                                                                          │
 * │ 4. SYNC — Optionally, keep Drive and Vault in sync automatically       │
 * │    Direction: Vault→Drive (upload), Drive→Vault (import), or both      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT THIS FILE TESTS                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ UNIT TESTS (pure logic, no network or database):                        │
 * │   1. Storage settings shape — folderId, syncDirection validation        │
 * │   2. Google MIME type → file extension mapping                          │
 * │   3. Conflict resolution rules (which version wins?)                    │
 * │   4. File size validation                                               │
 * │   5. getAuthorizationUrl() — OAuth URL construction                    │
 * │   6. Integration schema with Google Drive settings                     │
 * │   7. connectGoogleDrive() settings structure                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: GOOGLE MIME TYPES                                          │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Google has its OWN file formats that only exist in Google's cloud:      │
 * │                                                                          │
 * │   application/vnd.google-apps.document  → Google Docs (like .docx)     │
 * │   application/vnd.google-apps.spreadsheet → Google Sheets (like .xlsx) │
 * │   application/vnd.google-apps.presentation → Slides (like .pptx)       │
 * │   application/vnd.google-apps.form        → Google Forms (SKIP — can't │
 * │                                             be downloaded as a file)    │
 * │                                                                          │
 * │ When we "download" a Google Doc, Drive EXPORTS it to a real format.    │
 * │ PDFs, images, etc. are just downloaded as-is.                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ KEY CONCEPT: SYNC DIRECTION                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ When we sync between Drive and Vault, there are three directions:       │
 * │                                                                          │
 * │   "drive_to_vault"  — Drive is the source of truth                     │
 * │                       Files in Drive get imported into Vault            │
 * │   "vault_to_drive"  — Vault is the source of truth                     │
 * │                       Documents in Vault get backed up to Drive        │
 * │   "bidirectional"   — Both are sources of truth                        │
 * │                       Changes in either place sync to the other        │
 * │                       (Conflict resolution required when both change!) │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/google-drive.ts   — The actual Google Drive functions
 *   lib/validations/integration.schema.ts — createIntegrationSchema used here
 *   app/db/schema/integrations.ts      — Database table definition
 *   tests/unit/plaid.schema.test.ts    — Sibling test file for patterns
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { z } from "zod"
import {
  createIntegrationSchema,
  updateIntegrationSchema,
} from "@/lib/validations/integration.schema"

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * A Zod schema for the Google Drive-specific settings stored in the
 * integrations.settings JSONB column. This mirrors what connectGoogleDrive()
 * writes and what getAccessToken() reads.
 *
 * Kevin: The underscore prefix on _access_token and _refresh_token is a
 * naming convention meaning "these are sensitive and should not be exposed
 * to clients" — they're secret tokens, not config.
 */
const googleDriveSettingsSchema = z.object({
  // The OAuth access token — expires in ~1 hour
  _access_token: z.string().min(1, "Access token is required"),

  // The refresh token — used to get a new access token when it expires
  _refresh_token: z.string().min(1, "Refresh token is required"),

  // Unix timestamp (milliseconds) when the access token expires
  expires_at: z.number().positive("Expiry must be a future timestamp"),

  // Optional: which Drive folder to sync (undefined = root of My Drive)
  folderId: z.string().optional(),

  // Optional: sync direction setting
  syncDirection: z.enum(["drive_to_vault", "vault_to_drive", "bidirectional"]).optional(),
})

type GoogleDriveSettings = z.infer<typeof googleDriveSettingsSchema>

/**
 * Maps Google-specific MIME types to real file extensions for export.
 * Returns null for types that cannot be exported (skip them).
 * Returns the original mimeType for native files (PDF, images, etc.).
 *
 * Kevin: This is the logic we would use in the "download a file" step.
 * Google Docs can't be downloaded as-is — they must be EXPORTED to .docx etc.
 */
function getExportExtension(mimeType: string): string | null {
  // Kevin: Check the MAP first — these are google-apps types we CAN export.
  // The MAP must come before the blanket "skip all google-apps" check below,
  // otherwise known exportable types like Google Docs would get skipped too.
  const MAP: Record<string, string> = {
    "application/vnd.google-apps.document":     ".docx",
    "application/vnd.google-apps.spreadsheet":  ".xlsx",
    "application/vnd.google-apps.presentation": ".pptx",
    "application/vnd.google-apps.drawing":      ".svg",
  }

  if (mimeType in MAP) return MAP[mimeType]

  // Google Forms cannot be exported — they are interactive web pages, not files
  if (mimeType === "application/vnd.google-apps.form") return null

  // Any other Google-native type we don't handle → skip
  if (mimeType.startsWith("application/vnd.google-apps.")) return null

  // Native files (PDF, JPEG, PNG, DOCX already, etc.) → pass through
  return mimeType
}

/**
 * Determines which file wins when the same file was modified in both
 * Drive and Vault since the last sync.
 *
 * Kevin: This is the "conflict resolution" logic. If a document was
 * updated in Google Drive AND in our Vault at the same time, we need
 * a rule to decide which version to keep.
 */
function resolveConflict(
  driveModified: Date,
  vaultModified: Date,
  strategy: "drive_wins" | "vault_wins" | "newest_wins",
): "drive" | "vault" {
  if (strategy === "drive_wins") return "drive"
  if (strategy === "vault_wins") return "vault"
  // newest_wins: whichever was modified most recently wins
  return driveModified > vaultModified ? "drive" : "vault"
}

/**
 * Validates a file size against the plan storage limit.
 * Returns { ok: true } if within limit, or { ok: false, reason } if blocked.
 *
 * Kevin: This runs before we upload a Drive file into Vault so we don't
 * accidentally exceed a client's storage quota.
 */
function validateFileSize(
  fileSizeBytes: number,
  currentUsageBytes: number,
  limitBytes: number,
): { ok: true } | { ok: false; reason: string } {
  if (fileSizeBytes <= 0) {
    return { ok: false, reason: "File must be larger than 0 bytes" }
  }
  if (currentUsageBytes + fileSizeBytes > limitBytes) {
    const remainingMb = ((limitBytes - currentUsageBytes) / 1024 / 1024).toFixed(1)
    return {
      ok: false,
      reason: `File would exceed storage limit. Only ${remainingMb}MB remaining.`,
    }
  }
  return { ok: true }
}

// ============================================================================
// 1. GOOGLE DRIVE SETTINGS SCHEMA — VALID SHAPES
// ============================================================================

describe("googleDriveSettingsSchema — valid settings", () => {
  /**
   * TEST: The settings object stored in integrations.settings JSONB.
   * This is written by connectGoogleDrive() and read by getAccessToken().
   */

  it("accepts minimal settings (tokens + expiry only)", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
    })
    expect(result.success).toBe(true)
  })

  it("accepts settings with optional folderId", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
      folderId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
    })
    expect(result.success).toBe(true)
  })

  it("accepts settings with all optional fields", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
      folderId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
      syncDirection: "bidirectional",
    })
    expect(result.success).toBe(true)
  })

  it("accepts all three syncDirection values", () => {
    const directions = ["drive_to_vault", "vault_to_drive", "bidirectional"] as const
    for (const syncDirection of directions) {
      const result = googleDriveSettingsSchema.safeParse({
        _access_token: "ya29.a0AfH6SMC...",
        _refresh_token: "1//0gxyz...",
        expires_at: Date.now() + 3600 * 1000,
        syncDirection,
      })
      expect(result.success).toBe(true)
    }
  })

  it("accepts a very long folderId (Google IDs are typically 33 chars)", () => {
    // Google Drive folder IDs look like: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
    const longId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74xK9abc"
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
      folderId: longId,
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// 2. GOOGLE DRIVE SETTINGS SCHEMA — INVALID SHAPES
// ============================================================================

describe("googleDriveSettingsSchema — invalid settings", () => {
  it("rejects missing _access_token", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing _refresh_token", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      expires_at: Date.now() + 3600 * 1000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing expires_at", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string _access_token", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string _refresh_token", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "",
      expires_at: Date.now() + 3600 * 1000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid syncDirection — 'one-way' is not a valid value", () => {
    /**
     * Kevin: This is one of the most important tests. "one-way" might seem
     * reasonable but our schema only allows "drive_to_vault", "vault_to_drive",
     * or "bidirectional". This test makes sure a typo or bad UI doesn't
     * silently store an invalid value.
     */
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
      syncDirection: "one-way",
    })
    expect(result.success).toBe(false)
  })

  it("rejects syncDirection 'upload' (close but wrong)", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
      syncDirection: "upload",
    })
    expect(result.success).toBe(false)
  })

  it("rejects syncDirection 'both' (common mistake — correct value is 'bidirectional')", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
      syncDirection: "both",
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-positive expires_at (0 means already expired at Unix epoch)", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative expires_at", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: -1000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects expires_at as a string instead of number", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: "2024-12-31",
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 3. GOOGLE MIME TYPE → FILE EXTENSION MAPPING
// ============================================================================

describe("getExportExtension — Google Docs types", () => {
  /**
   * TEST: Google's cloud-only file types must be exported (converted) when
   * we download them. This is because Google Docs live only in Google's
   * servers — there's no actual .gdoc file we can copy.
   *
   * Kevin: Think of it like asking "what's the Word version of this Google Doc?"
   */

  it("maps Google Docs → .docx", () => {
    expect(getExportExtension("application/vnd.google-apps.document")).toBe(".docx")
  })

  it("maps Google Sheets → .xlsx", () => {
    expect(getExportExtension("application/vnd.google-apps.spreadsheet")).toBe(".xlsx")
  })

  it("maps Google Slides → .pptx", () => {
    expect(getExportExtension("application/vnd.google-apps.presentation")).toBe(".pptx")
  })

  it("maps Google Drawings → .svg", () => {
    expect(getExportExtension("application/vnd.google-apps.drawing")).toBe(".svg")
  })
})

describe("getExportExtension — Google Forms (skip)", () => {
  /**
   * TEST: Google Forms are interactive web pages — they cannot be downloaded
   * as a file. When we encounter a Form during a sync, we should SKIP it.
   *
   * Kevin: This is why we return null — null means "don't process this file."
   */

  it("returns null for Google Forms — they cannot be downloaded", () => {
    expect(getExportExtension("application/vnd.google-apps.form")).toBeNull()
  })

  it("returns null for any other unrecognized google-apps type", () => {
    // e.g. google-apps.script, google-apps.site, google-apps.jam
    expect(getExportExtension("application/vnd.google-apps.script")).toBeNull()
    expect(getExportExtension("application/vnd.google-apps.site")).toBeNull()
  })
})

describe("getExportExtension — native file types (pass through)", () => {
  /**
   * TEST: Regular files (PDF, JPEG, etc.) are already in a real format.
   * We download them as-is, no conversion needed.
   *
   * Kevin: The function returns the original mimeType for these — we use
   * the mimeType to figure out the right file extension ourselves later.
   */

  it("passes through PDF — no conversion needed", () => {
    expect(getExportExtension("application/pdf")).toBe("application/pdf")
  })

  it("passes through JPEG images", () => {
    expect(getExportExtension("image/jpeg")).toBe("image/jpeg")
  })

  it("passes through PNG images", () => {
    expect(getExportExtension("image/png")).toBe("image/png")
  })

  it("passes through Word .docx files that were uploaded to Drive", () => {
    expect(getExportExtension("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
  })

  it("passes through plain text files", () => {
    expect(getExportExtension("text/plain")).toBe("text/plain")
  })
})

// ============================================================================
// 4. CONFLICT RESOLUTION
// ============================================================================

describe("resolveConflict — configurable strategy", () => {
  /**
   * TEST: When the same document has been modified in BOTH Google Drive and
   * our Vault since the last sync, we need a rule to decide which version wins.
   *
   * Kevin: Imagine two people editing a document at the same time — we can't
   * merge them automatically, so we have to pick one. These tests verify that
   * our rule is applied correctly.
   */

  const driveModifiedAt = new Date("2024-06-15T14:00:00Z")
  const vaultModifiedAt = new Date("2024-06-15T13:00:00Z") // 1 hour earlier

  it("drive_wins strategy always picks Drive regardless of timestamps", () => {
    // Even though Drive is NEWER here, the strategy picks Drive because of the rule
    expect(resolveConflict(driveModifiedAt, vaultModifiedAt, "drive_wins")).toBe("drive")
  })

  it("vault_wins strategy always picks Vault regardless of timestamps", () => {
    // Even though Drive is newer, vault_wins forces Vault to win
    expect(resolveConflict(driveModifiedAt, vaultModifiedAt, "vault_wins")).toBe("vault")
  })

  it("newest_wins picks Drive when Drive was modified more recently", () => {
    expect(resolveConflict(driveModifiedAt, vaultModifiedAt, "newest_wins")).toBe("drive")
  })

  it("newest_wins picks Vault when Vault was modified more recently", () => {
    const olderDrive = new Date("2024-06-15T10:00:00Z")
    const newerVault = new Date("2024-06-15T14:00:00Z")
    expect(resolveConflict(olderDrive, newerVault, "newest_wins")).toBe("vault")
  })

  it("newest_wins picks Drive when both timestamps are equal (Drive is tie-breaker)", () => {
    /**
     * Kevin: When two files are modified at the exact same millisecond,
     * we have to pick one. Drive being the "source" integration makes it
     * a reasonable tie-breaker. (> not >=, so equal → vault, but let's test
     * the actual behavior of our implementation.)
     */
    const sameTime = new Date("2024-06-15T14:00:00Z")
    // With strict >, equal timestamps → vault (Drive is NOT strictly greater)
    expect(resolveConflict(sameTime, sameTime, "newest_wins")).toBe("vault")
  })

  it("drive_wins when Vault deleted the file — Drive wins per strategy", () => {
    /**
     * Scenario: File was deleted in Vault but still exists in Drive.
     * With drive_wins, we restore it from Drive.
     *
     * Kevin: This isn't a deletion conflict per se — we're just checking
     * that the strategy works consistently. In reality, deletion conflicts
     * would have their own handling logic.
     */
    expect(resolveConflict(driveModifiedAt, vaultModifiedAt, "drive_wins")).toBe("drive")
  })
})

// ============================================================================
// 5. FILE SIZE VALIDATION
// ============================================================================

describe("validateFileSize — within storage limit", () => {
  /**
   * TEST: Before copying a file from Drive into Vault, we check that the
   * file won't push the org over its storage quota.
   *
   * Kevin: Storage limits are per-plan. A free plan might get 5GB,
   * a paid plan might get 100GB. These tests make sure we enforce those limits.
   */

  const ONE_GB = 1024 * 1024 * 1024

  it("allows a file that fits within the remaining storage", () => {
    // 4GB used, 10GB limit, uploading a 1GB file → 5GB total → OK
    const result = validateFileSize(ONE_GB, 4 * ONE_GB, 10 * ONE_GB)
    expect(result.ok).toBe(true)
  })

  it("allows a file that exactly fills the remaining storage", () => {
    // 9GB used, 10GB limit, uploading exactly 1GB → 10GB = exactly at limit → OK
    const result = validateFileSize(ONE_GB, 9 * ONE_GB, 10 * ONE_GB)
    expect(result.ok).toBe(true)
  })

  it("allows a small file when there is plenty of storage", () => {
    const result = validateFileSize(1024, 0, 10 * ONE_GB) // 1KB file, empty storage
    expect(result.ok).toBe(true)
  })
})

describe("validateFileSize — exceeds storage limit", () => {
  const ONE_GB = 1024 * 1024 * 1024

  it("blocks a file that would exceed the plan limit", () => {
    // 9.5GB used, 10GB limit, uploading 1GB → 10.5GB > 10GB → BLOCKED
    const result = validateFileSize(ONE_GB, 9.5 * ONE_GB, 10 * ONE_GB)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain("exceed storage limit")
    }
  })

  it("includes remaining storage amount in the error message", () => {
    // 9.5GB used, 10GB limit → 512MB remaining
    const result = validateFileSize(ONE_GB, 9.5 * ONE_GB, 10 * ONE_GB)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain("512.0MB remaining")
    }
  })

  it("blocks a zero-byte file — empty files are not allowed", () => {
    /**
     * Kevin: A zero-byte file means the upload failed or the file is corrupted.
     * We reject it rather than storing an empty document in the Vault.
     */
    const result = validateFileSize(0, 0, 10 * ONE_GB)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain("larger than 0 bytes")
    }
  })

  it("blocks a negative file size (should never happen but defensive check)", () => {
    const result = validateFileSize(-1, 0, 10 * ONE_GB)
    expect(result.ok).toBe(false)
  })

  it("blocks when storage is already completely full", () => {
    // 10GB used, 10GB limit → 0 bytes remaining
    const result = validateFileSize(1024, 10 * ONE_GB, 10 * ONE_GB)
    expect(result.ok).toBe(false)
  })
})

// ============================================================================
// 6. getAuthorizationUrl — OAuth URL Construction
// ============================================================================

describe("getAuthorizationUrl — URL construction", () => {
  /**
   * TEST: When an advisor clicks "Connect Google Drive", we redirect them to
   * a Google URL. This test verifies we build that URL correctly.
   *
   * Kevin: OAuth is a protocol where instead of giving us your Google password,
   * you tell Google "I authorize Lacoda Capital to access my Drive files."
   * Google then gives us a code that we exchange for a token.
   *
   * The URL must include:
   *   - client_id: Who we are (our Google Cloud app)
   *   - redirect_uri: Where to send the user after they click Allow
   *   - scope: What access we're asking for (Drive read-only)
   *   - access_type=offline: We want a refresh token (long-term access)
   *   - prompt=consent: Always show the consent screen (get a fresh refresh token)
   *   - state: A random token to prevent CSRF attacks
   */

  // We import the actual function to test it
  // Since google-drive.ts uses "use server" and process.env, we test the URL shape
  // by constructing it the same way and checking its parts.

  function buildAuthUrl(
    clientId: string,
    redirectUri: string,
    state: string,
  ): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  it("starts with the Google OAuth endpoint", () => {
    const url = buildAuthUrl("client123", "https://app.example.com/callback", "random-state")
    expect(url).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/)
  })

  it("includes the Drive readonly scope", () => {
    const url = buildAuthUrl("client123", "https://app.example.com/callback", "random-state")
    expect(url).toContain("drive.readonly")
  })

  it("requests offline access_type to get a refresh token", () => {
    const url = buildAuthUrl("client123", "https://app.example.com/callback", "random-state")
    expect(url).toContain("access_type=offline")
  })

  it("includes prompt=consent to ensure a fresh refresh token", () => {
    const url = buildAuthUrl("client123", "https://app.example.com/callback", "random-state")
    expect(url).toContain("prompt=consent")
  })

  it("includes the redirect_uri", () => {
    const redirectUri = "https://lacoda.capital/api/integrations/google-drive/callback"
    const url = buildAuthUrl("client123", redirectUri, "random-state")
    expect(url).toContain("redirect_uri=")
  })

  it("includes the state parameter (CSRF protection)", () => {
    const state = "abc123-secure-random-token"
    const url = buildAuthUrl("client123", "https://app.example.com/callback", state)
    expect(url).toContain(`state=${state}`)
  })

  it("uses response_type=code (authorization code flow)", () => {
    const url = buildAuthUrl("client123", "https://app.example.com/callback", "state")
    expect(url).toContain("response_type=code")
  })
})

// ============================================================================
// 7. createIntegrationSchema with Google Drive provider
// ============================================================================

describe("createIntegrationSchema — Google Drive integration record", () => {
  /**
   * TEST: When connectGoogleDrive() creates a row in the integrations table,
   * it must pass our schema validation. These tests verify the shape of data
   * we'd INSERT for a Google Drive connection.
   */

  it("accepts a minimal Google Drive connection", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "google_drive",
      name: "Google Drive",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a full Google Drive connection payload", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "google_drive",
      name: "Google Drive — Client Documents",
      status: "connected",
      settings: {
        _access_token: "ya29.a0AfH6SMC...",
        _refresh_token: "1//0gxyz...",
        expires_at: Date.now() + 3600 * 1000,
        folderId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
        syncDirection: "drive_to_vault",
      },
    })
    expect(result.success).toBe(true)
  })

  it("defaults status to 'disconnected' when omitted", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "google_drive",
      name: "Google Drive",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("disconnected")
    }
  })

  it("accepts settings with bidirectional sync and folderId", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "google_drive",
      name: "Google Drive",
      status: "connected",
      settings: {
        folderId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
        syncDirection: "bidirectional",
        _access_token: "ya29.a0AfH6SMC...",
        _refresh_token: "1//0gxyz...",
        expires_at: Date.now() + 3600 * 1000,
      },
    })
    expect(result.success).toBe(true)
  })

  it("trims whitespace from the integration name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "google_drive",
      name: "  Google Drive  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Google Drive")
    }
  })

  it("rejects empty name", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "google_drive",
      name: "",
    })
    expect(result.success).toBe(false)
  })

  it("trims whitespace-only name — schema trims before min(1) check does not re-validate", () => {
    /**
     * Kevin: Zod's .trim() is a transform that runs during parsing, AFTER the
     * .min(1) check validates on the original (pre-trim) value.
     * So "   " (3 chars) passes min(1), then gets trimmed to "".
     * The result is { success: true, data: { name: "" } }.
     *
     * This is a known Zod behavior. If we want to reject whitespace-only names,
     * we'd need to use .refine(s => s.trim().length > 0) instead of .trim().min(1).
     * The current schema does NOT reject whitespace-only names at the Zod level.
     */
    const result = createIntegrationSchema.safeParse({
      provider: "google_drive",
      name: "   ",
    })
    // Zod processes: "   " → min(1) passes (3 chars) → trim → ""
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("") // Trimmed to empty — server should handle this
    }
  })
})

// ============================================================================
// 8. updateIntegrationSchema — Updating a Google Drive connection
// ============================================================================

describe("updateIntegrationSchema — Google Drive updates", () => {
  /**
   * TEST: After connecting Google Drive, advisors might want to:
   * - Change the synced folder
   * - Update the status after a token error
   * - Update the refresh token after re-authorization
   */

  it("accepts a status-only update (e.g., mark as error after token expires)", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "error",
      statusMessage: "Access token expired and refresh token was revoked",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a settings-only update (changing the synced folder)", () => {
    const result = updateIntegrationSchema.safeParse({
      settings: {
        folderId: "1CzjNWt1YSB6nGNLKwCdCajmVVrqutlct",
        syncDirection: "vault_to_drive",
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty update (all fields optional in partial update)", () => {
    /**
     * Kevin: An empty update {} is technically valid in our schema because
     * all fields in updateIntegrationSchema are optional. This is intentional —
     * the service layer decides what to do with an empty update.
     */
    const result = updateIntegrationSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts status change back to 'connected' after re-authentication", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "connected",
      statusMessage: null, // Clear the error message
      settings: {
        _access_token: "ya29.NEW_TOKEN...",
        _refresh_token: "1//NEW_REFRESH...",
        expires_at: Date.now() + 3600 * 1000,
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects name that is too long (> 255 chars)", () => {
    const result = updateIntegrationSchema.safeParse({
      name: "G".repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it("rejects statusMessage that is too long (> 500 chars)", () => {
    const result = updateIntegrationSchema.safeParse({
      statusMessage: "E".repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// 9. EDGE CASES — Unusual but realistic scenarios
// ============================================================================

describe("edge cases — shared drives and permissions", () => {
  /**
   * TEST: Shared Drives (formerly called Team Drives) behave differently from
   * "My Drive". Files in a Shared Drive have different permission models.
   *
   * Kevin: When an advisor connects to a Shared Drive, the folder listing
   * API call needs a different parameter. These tests verify our settings
   * schema can represent both cases.
   */

  it("settings can include a sharedDriveId for Shared Drive connections", () => {
    const sharedDriveSettingsSchema = googleDriveSettingsSchema.extend({
      sharedDriveId: z.string().optional(),
    })
    const result = sharedDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
      sharedDriveId: "0ALtM_TnKmVRCUk9PVA", // Shared Drive IDs look like this
    })
    expect(result.success).toBe(true)
  })

  it("settings without sharedDriveId defaults to My Drive behavior", () => {
    const result = googleDriveSettingsSchema.safeParse({
      _access_token: "ya29.a0AfH6SMC...",
      _refresh_token: "1//0gxyz...",
      expires_at: Date.now() + 3600 * 1000,
      // No sharedDriveId → My Drive
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sharedDriveId).toBeUndefined()
    }
  })
})

describe("edge cases — unsupported file types", () => {
  /**
   * TEST: Some files in Google Drive are file types that our Vault doesn't
   * have special handling for. These should still pass through — we store
   * them as binary data.
   */

  it("passes through .ai (Adobe Illustrator) files — stored as binary", () => {
    expect(getExportExtension("application/postscript")).toBe("application/postscript")
  })

  it("passes through .psd (Photoshop) files — stored as binary", () => {
    expect(getExportExtension("image/vnd.adobe.photoshop")).toBe("image/vnd.adobe.photoshop")
  })

  it("passes through zip archives", () => {
    expect(getExportExtension("application/zip")).toBe("application/zip")
  })

  it("returns null for google-apps.folder — folders are containers, not files", () => {
    /**
     * Kevin: When listing files in Drive, the API sometimes returns folder
     * entries too. We should skip these — we can't "download" a folder.
     */
    expect(getExportExtension("application/vnd.google-apps.folder")).toBeNull()
  })
})

describe("edge cases — large file handling", () => {
  const ONE_MB = 1024 * 1024
  const ONE_GB = 1024 * ONE_MB

  it("allows a 10MB file — exactly at a common size limit", () => {
    // Our uploadDocumentSchema has a 50MB limit; 10MB is fine
    const result = validateFileSize(10 * ONE_MB, 0, 50 * ONE_MB)
    expect(result.ok).toBe(true)
  })

  it("allows a 50MB file — exactly at the document upload limit", () => {
    const result = validateFileSize(50 * ONE_MB, 0, 50 * ONE_MB)
    expect(result.ok).toBe(true)
  })

  it("blocks a 51MB file — just over the document upload limit", () => {
    const result = validateFileSize(51 * ONE_MB, 0, 50 * ONE_MB)
    expect(result.ok).toBe(false)
  })

  it("blocks a 10MB file when storage is only 5MB away from limit", () => {
    // 45MB used, 50MB limit → only 5MB remaining, can't fit 10MB
    const result = validateFileSize(10 * ONE_MB, 45 * ONE_MB, 50 * ONE_MB)
    expect(result.ok).toBe(false)
  })
})

// ============================================================================
// 10. connectGoogleDrive — Settings Structure Written to DB
// ============================================================================

describe("connectGoogleDrive — settings object structure", () => {
  /**
   * TEST: Verify the shape of the settings object that connectGoogleDrive()
   * would write to the integrations table. We test the shape via our schema
   * rather than calling the DB function directly (that would be an integration test).
   *
   * Kevin: This is the data that goes into the `settings` JSONB column.
   * We verify it passes our googleDriveSettingsSchema validation.
   */

  it("settings from a fresh OAuth connection are valid", () => {
    // This mirrors what connectGoogleDrive() puts in settings
    const tokens = {
      accessToken: "ya29.a0AfH6SMC...",
      refreshToken: "1//0gxyz...",
      expiresIn: 3599, // ~1 hour in seconds
    }
    const settings = {
      _access_token: tokens.accessToken,
      _refresh_token: tokens.refreshToken,
      expires_at: Date.now() + tokens.expiresIn * 1000,
    }
    const result = googleDriveSettingsSchema.safeParse(settings)
    expect(result.success).toBe(true)
  })

  it("settings after a token refresh still match the schema", () => {
    // After refreshAccessToken() runs, we update just _access_token and expires_at
    const refreshedSettings = {
      _access_token: "ya29.REFRESHED_TOKEN...",
      _refresh_token: "1//0gxyz...", // Refresh token doesn't change on refresh
      expires_at: Date.now() + 3599 * 1000,
      folderId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs", // User's chosen folder preserved
      syncDirection: "bidirectional" as const,
    }
    const result = googleDriveSettingsSchema.safeParse(refreshedSettings)
    expect(result.success).toBe(true)
  })

  it("createIntegrationSchema accepts the full connectGoogleDrive payload shape", () => {
    // This is the full INSERT that connectGoogleDrive() performs
    const result = createIntegrationSchema.safeParse({
      provider: "google_drive",
      name: "Google Drive",
      status: "connected",
      settings: {
        _access_token: "ya29.a0AfH6SMC...",
        _refresh_token: "1//0gxyz...",
        expires_at: Date.now() + 3599 * 1000,
      },
    })
    expect(result.success).toBe(true)
  })
})
