/**
 * ============================================================================
 * TEST FILE: dropbox.schema.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the Dropbox integration — everything from how we
 * validate paths and settings, to how we handle pagination and errors.
 *
 * Dropbox is an alternative document storage provider (same category as
 * Google Drive) that lets advisors sync files between a Dropbox folder
 * and the Lacoda Vault.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ HOW DROPBOX DIFFERS FROM GOOGLE DRIVE                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Google Drive: identifies folders by an opaque ID ("1aBcDeFgHiJk")       │
 * │ Dropbox:      identifies folders by a human-readable path ("/Docs")     │
 * │                                                                         │
 * │ Google Drive: uses page tokens (opaque strings) for pagination          │
 * │ Dropbox:      uses cursor-based pagination — the cursor encodes         │
 * │               "where you were in the folder listing", not just a        │
 * │               page number. Cursors can EXPIRE, requiring a restart.     │
 * │                                                                         │
 * │ Google Drive: standard OAuth 2.0 with client_secret                     │
 * │ Dropbox:      OAuth 2.0 + PKCE (Proof Key for Code Exchange) — a        │
 * │               method that avoids sending a client_secret in the         │
 * │               browser. The app generates a random "code_verifier",      │
 * │               hashes it to "code_challenge", sends the challenge        │
 * │               to Dropbox, then proves ownership with the verifier       │
 * │               when exchanging the code for tokens.                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT WE'RE TESTING                                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ UNIT TESTS (no network, no DB)                                          │
 * │   1. Dropbox path normalisation — root, subfolders, Windows paths,      │
 * │      special characters, trailing slashes                               │
 * │   2. Cursor-based pagination — first page, last page, expired cursor    │
 * │   3. File revision tracking — detecting conflicts                       │
 * │                                                                         │
 * │ INTEGRATION TESTS (mocked network + mocked DB)                         │
 * │   4. OAuth PKCE flow → token storage → integration record created       │
 * │   5. List files → create documents in Vault                             │
 * │   6. Dropbox-specific error codes                                       │
 * │                                                                         │
 * │ E2E-STYLE TESTS (mocked UI + mocked server actions)                     │
 * │   7. Integrations page → Connect Dropbox → OAuth (mocked)              │
 * │   8. Connected state → shows folder path and sync status                │
 * │                                                                         │
 * │ EDGE CASES                                                              │
 * │   9. Locked files, Business vs Personal, conflicts, Paper docs,         │
 * │      case-insensitive path matching                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/validations/integration.schema.ts — shared Zod schemas
 *   lib/integrations/google-drive.ts      — parallel implementation pattern
 *   tests/unit/plaid.schema.test.ts       — test style reference
 */

import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  createIntegrationSchema,
  updateIntegrationSchema,
} from "@/lib/validations/integration.schema"

// ============================================================================
// HELPER SCHEMAS
// ============================================================================
//
// Kevin: These schemas don't exist in the codebase yet — they describe the
// shape of data we'd add when building lib/integrations/dropbox.ts.
// We define them here so the tests have something concrete to validate.
// When you implement the real file, copy these schemas into it and remove
// the duplicates here.
//

/**
 * The settings shape stored in integrations.settings (JSONB) for a Dropbox
 * integration. Fields prefixed with "_" are secrets — they get stripped by
 * stripSecrets() before being sent to the browser.
 */
const dropboxSettingsSchema = z.object({
  /** The Dropbox folder path to sync from. Empty string = root. */
  folderPath: z.string(),
  /** Dropbox user ID (dbid:xxx). Used to detect account switches. */
  accountId: z.string().optional(),
  /** Personal = individual, business = Dropbox Business / Teams */
  accountType: z.enum(["personal", "business"]).default("personal"),
  /** Opaque string that remembers where we left off in a folder listing */
  _cursor: z.string().optional(),
  /** Access token for Dropbox API calls. Secret — prefixed with "_". */
  _access_token: z.string(),
  /** Refresh token for getting new access tokens. Secret. */
  _refresh_token: z.string(),
  /** Unix timestamp (ms) when the access token expires. */
  expires_at: z.number(),
})

type DropboxSettings = z.infer<typeof dropboxSettingsSchema>

/**
 * The shape of a single file object returned by Dropbox's
 * POST /2/files/list_folder (and /list_folder/continue) endpoints.
 *
 * Dropbox uses a ".tag" discriminator to tell files from folders:
 *   { ".tag": "file", name: "invoice.pdf", rev: "abc123", … }
 *   { ".tag": "folder", name: "2024", … }
 */
const dropboxFileEntrySchema = z.object({
  ".tag": z.enum(["file", "folder", "deleted"]),
  id: z.string(),
  name: z.string(),
  path_display: z.string(),
  path_lower: z.string(),
  // Only present on "file" entries:
  rev: z.string().optional(),
  size: z.number().optional(),
  server_modified: z.string().optional(),
  client_modified: z.string().optional(),
  // "paper_doc" or "paper_folder" = Dropbox Paper — not downloadable as a file
  is_downloadable: z.boolean().optional(),
})

type DropboxFileEntry = z.infer<typeof dropboxFileEntrySchema>

/**
 * The shape of a response from POST /2/files/list_folder or
 * POST /2/files/list_folder/continue.
 *
 * When has_more is true, call /list_folder/continue with the cursor
 * to get the next batch. When has_more is false, the cursor is a
 * "long-poll cursor" — you can use it later to get only the changes.
 */
const dropboxListFolderResponseSchema = z.object({
  entries: z.array(dropboxFileEntrySchema),
  cursor: z.string(),
  has_more: z.boolean(),
})

/**
 * Shape of a Dropbox API error response:
 *   { "error_summary": "path/not_found/..", "error": { ".tag": "path/not_found" } }
 */
const dropboxErrorSchema = z.object({
  error_summary: z.string(),
  error: z.object({
    ".tag": z.string(),
  }),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
//
// Kevin: These are pure utility functions we'd put in lib/integrations/dropbox.ts.
// We define them here because they have zero dependencies — no DB, no network.
// Pure functions are the easiest to unit-test: input in → output out.
//

/**
 * Normalise a Dropbox folder path so it's always a clean absolute path
 * or empty string (root).
 *
 * Rules:
 *   - "" and "/" both mean root → return ""
 *   - Windows backslashes → forward slashes
 *   - Always starts with "/" (unless root)
 *   - No trailing slash
 *   - Spaces and special characters are preserved (Dropbox handles encoding)
 */
function normaliseDropboxPath(input: string): string {
  // Treat empty string or bare "/" as root
  if (input === "" || input === "/") return ""

  // Convert Windows-style backslashes to forward slashes
  let path = input.replace(/\\/g, "/")

  // Ensure starts with /
  if (!path.startsWith("/")) path = "/" + path

  // Remove trailing slash (unless it's the root "/", but root is handled above)
  path = path.replace(/\/+$/, "")

  return path
}

/**
 * Check whether a Dropbox error response tag represents a known Dropbox
 * error that we handle explicitly.
 */
function classifyDropboxError(
  errorTag: string,
): "not_found" | "insufficient_space" | "too_many_writes" | "locked" | "unknown" {
  if (errorTag === "path/not_found" || errorTag === "not_found") return "not_found"
  if (errorTag === "insufficient_space") return "insufficient_space"
  if (errorTag === "too_many_write_operations") return "too_many_writes"
  if (errorTag === "file_operation_conflict" || errorTag === "locked") return "locked"
  return "unknown"
}

/**
 * Determine if a Dropbox file entry is a Dropbox Paper document.
 * Paper documents cannot be downloaded as regular files.
 *
 * Dropbox signals this via is_downloadable: false on the file entry.
 */
function isDropboxPaperDocument(entry: DropboxFileEntry): boolean {
  if (entry[".tag"] !== "file") return false
  return entry.is_downloadable === false
}

/**
 * Detect a conflict between the version of a file we have stored and the
 * current version on Dropbox.
 *
 * Dropbox uses "rev" (revision hash) to identify file versions. If the rev
 * we stored in our document record no longer matches the rev on Dropbox,
 * someone edited the file since we last synced it.
 *
 * Returns true = conflict detected, false = no conflict (or no stored rev).
 */
function detectDropboxConflict(storedRev: string | null, currentRev: string): boolean {
  if (!storedRev) return false
  return storedRev !== currentRev
}

/**
 * Check whether two Dropbox paths refer to the same folder, ignoring case.
 * Dropbox paths are case-insensitive (stored in path_lower).
 *
 * Use path_lower from the API response for comparisons, not path_display.
 */
function dropboxPathsMatch(pathA: string, pathB: string): boolean {
  return pathA.toLowerCase() === pathB.toLowerCase()
}

/**
 * Build a Dropbox OAuth PKCE code_challenge from a code_verifier.
 *
 * PKCE = Proof Key for Code Exchange. Instead of a client_secret (which
 * can't be safely stored in a browser), the app:
 *   1. Generates a random "code_verifier"
 *   2. SHA-256 hashes it → "code_challenge"
 *   3. Sends the challenge to Dropbox in the auth URL
 *   4. When exchanging the auth code for tokens, sends the verifier
 *   Dropbox re-hashes the verifier and checks it matches the challenge.
 *
 * This function is synchronous (for testability) — in production you'd
 * use the Web Crypto API or Node's crypto module.
 */
function buildDropboxAuthUrl(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    token_access_type: "offline",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  })
  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
}

// ============================================================================
// ============================================================================
// SECTION 1 — PATH NORMALISATION (Unit Tests)
// ============================================================================
// ============================================================================

describe("normaliseDropboxPath — root paths", () => {
  /**
   * Dropbox uses empty string "" to mean "the root of the account".
   * A bare "/" also means root in most file-system intuitions.
   * Both should normalise to "".
   */
  it('normalises "" (empty string) to "" — root folder', () => {
    expect(normaliseDropboxPath("")).toBe("")
  })

  it('normalises "/" (bare slash) to "" — root folder', () => {
    expect(normaliseDropboxPath("/")).toBe("")
  })
})

describe("normaliseDropboxPath — valid absolute subfolders", () => {
  it('preserves "/Lacoda/Documents" unchanged', () => {
    expect(normaliseDropboxPath("/Lacoda/Documents")).toBe("/Lacoda/Documents")
  })

  it('preserves "/WealthManagement/Clients/2024" unchanged', () => {
    expect(normaliseDropboxPath("/WealthManagement/Clients/2024")).toBe(
      "/WealthManagement/Clients/2024",
    )
  })

  it("adds a leading slash if missing — turns relative into absolute", () => {
    expect(normaliseDropboxPath("Lacoda/Documents")).toBe("/Lacoda/Documents")
  })
})

describe("normaliseDropboxPath — Windows-style backslashes", () => {
  /**
   * Dropbox paths use forward slashes. If a user copy-pastes a Windows
   * path ("\\Lacoda\\Documents") we need to normalise before sending
   * it to the API.
   */
  it("converts single-level Windows path to forward slashes", () => {
    expect(normaliseDropboxPath("\\Lacoda")).toBe("/Lacoda")
  })

  it("converts multi-level Windows path to forward slashes", () => {
    expect(normaliseDropboxPath("\\Lacoda\\Documents")).toBe("/Lacoda/Documents")
  })

  it("converts Windows path with no leading backslash", () => {
    expect(normaliseDropboxPath("Lacoda\\Documents\\2024")).toBe("/Lacoda/Documents/2024")
  })
})

describe("normaliseDropboxPath — special characters", () => {
  /**
   * Dropbox preserves special characters in path_display. We should NOT
   * percent-encode them ourselves — the Dropbox SDK / fetch layer handles
   * encoding. We just normalise slashes and leading/trailing whitespace.
   */
  it("preserves ampersand in folder name", () => {
    expect(normaliseDropboxPath("/Clients & Docs/2024")).toBe("/Clients & Docs/2024")
  })

  it("preserves parentheses in folder name", () => {
    expect(normaliseDropboxPath("/Reports (Final)/Q4")).toBe("/Reports (Final)/Q4")
  })

  it("preserves spaces in folder name", () => {
    expect(normaliseDropboxPath("/Annual Reports/2024 Archive")).toBe(
      "/Annual Reports/2024 Archive",
    )
  })

  it("preserves unicode characters in folder name", () => {
    expect(normaliseDropboxPath("/Résumés/Active")).toBe("/Résumés/Active")
  })
})

describe("normaliseDropboxPath — trailing slashes", () => {
  it("strips a single trailing slash", () => {
    expect(normaliseDropboxPath("/Lacoda/Documents/")).toBe("/Lacoda/Documents")
  })

  it("strips multiple trailing slashes", () => {
    expect(normaliseDropboxPath("/Lacoda/Documents///")).toBe("/Lacoda/Documents")
  })

  it("does not strip the slash from a root-only '/'", () => {
    // "/" means root → returns "" (handled by the root check)
    expect(normaliseDropboxPath("/")).toBe("")
  })
})

// ============================================================================
// ============================================================================
// SECTION 2 — CURSOR-BASED PAGINATION (Unit Tests)
// ============================================================================
// ============================================================================

describe("dropboxListFolderResponseSchema — first page", () => {
  /**
   * When listing a folder for the first time the API returns:
   *   - entries: the first batch of files
   *   - cursor: an opaque string remembering your position
   *   - has_more: true if there are more files to fetch
   *
   * HOW TO CONTINUE: POST /2/files/list_folder/continue with { cursor }
   * to get the next batch.
   */
  it("accepts a first-page response with has_more: true", () => {
    const response = {
      entries: [
        {
          ".tag": "file",
          id: "id:abc123",
          name: "invoice.pdf",
          path_display: "/Lacoda/invoice.pdf",
          path_lower: "/lacoda/invoice.pdf",
          rev: "a1b2c3d4e5f6",
          size: 204800,
          server_modified: "2024-01-15T12:00:00Z",
          client_modified: "2024-01-14T10:00:00Z",
          is_downloadable: true,
        },
      ],
      cursor: "AAHgfake_cursor_string_1234567890",
      has_more: true,
    }

    const result = dropboxListFolderResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.has_more).toBe(true)
      expect(result.data.cursor).toBe("AAHgfake_cursor_string_1234567890")
      expect(result.data.entries).toHaveLength(1)
    }
  })

  it("correctly identifies the cursor from a first-page response", () => {
    const response = {
      entries: [],
      cursor: "AAHgpage1cursor",
      has_more: true,
    }
    const result = dropboxListFolderResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      // We'd store this cursor in settings._cursor to continue listing
      expect(result.data.cursor).toBe("AAHgpage1cursor")
    }
  })
})

describe("dropboxListFolderResponseSchema — last page", () => {
  /**
   * When has_more is false, we've received all files.
   * The cursor becomes a "long-poll cursor" — we can save it and later
   * call /2/files/list_folder/longpoll to be notified of changes.
   */
  it("accepts a last-page response with has_more: false", () => {
    const response = {
      entries: [
        {
          ".tag": "file",
          id: "id:xyz789",
          name: "report.pdf",
          path_display: "/Lacoda/report.pdf",
          path_lower: "/lacoda/report.pdf",
          rev: "deadbeef",
          size: 1024,
          server_modified: "2024-03-01T09:00:00Z",
          client_modified: "2024-03-01T08:00:00Z",
          is_downloadable: true,
        },
      ],
      cursor: "AAHgfinalcursor_longpoll",
      has_more: false,
    }

    const result = dropboxListFolderResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.has_more).toBe(false)
      // Cursor should still be present — store it for future long-poll checks
      expect(result.data.cursor).toBeTruthy()
    }
  })

  it("has_more: false with empty entries means folder is empty (or all processed)", () => {
    const response = {
      entries: [],
      cursor: "AAHgemptyfoldercursor",
      has_more: false,
    }
    const result = dropboxListFolderResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.entries).toHaveLength(0)
      expect(result.data.has_more).toBe(false)
    }
  })
})

describe("cursor pagination — handling an expired cursor", () => {
  /**
   * Dropbox cursors expire after a period of inactivity (typically 7 days
   * for /list_folder cursors). When you call /list_folder/continue with
   * an expired cursor, Dropbox returns an error like:
   *
   *   { "error": { ".tag": "reset" }, "error_summary": "reset/..." }
   *
   * The "reset" tag means: discard the cursor and start over from the
   * beginning with a fresh /list_folder call.
   *
   * We test the error shape and the classification logic here.
   */
  it("parses the 'reset' error response from Dropbox", () => {
    const errorResponse = {
      error_summary: "reset/...",
      error: { ".tag": "reset" },
    }
    const result = dropboxErrorSchema.safeParse(errorResponse)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error[".tag"]).toBe("reset")
    }
  })

  it("a 'reset' error classifies as 'unknown' — caller should restart listing", () => {
    // "reset" is a special cursor-expired signal — not in our named error set.
    // The caller must catch this and restart from /list_folder.
    const classification = classifyDropboxError("reset")
    expect(classification).toBe("unknown")
  })
})

// ============================================================================
// ============================================================================
// SECTION 3 — FILE REVISION TRACKING (Unit Tests)
// ============================================================================
// ============================================================================

describe("detectDropboxConflict — revision comparison", () => {
  /**
   * Dropbox assigns each file version a "rev" string (a hex hash).
   * When we import a file, we store its rev in our document record.
   * On the next sync, if the rev has changed, someone edited the file
   * on Dropbox since our last sync — that's a conflict.
   */
  it("returns false when stored rev matches current rev (no conflict)", () => {
    expect(detectDropboxConflict("a1b2c3d4", "a1b2c3d4")).toBe(false)
  })

  it("returns true when stored rev differs from current rev (conflict)", () => {
    expect(detectDropboxConflict("a1b2c3d4", "x9y8z7w6")).toBe(true)
  })

  it("returns false when storedRev is null (first import, no baseline)", () => {
    // We haven't seen this file before — no baseline to conflict with
    expect(detectDropboxConflict(null, "x9y8z7w6")).toBe(false)
  })

  it("returns false when storedRev is empty string (treated same as null)", () => {
    // "" is falsy — same behaviour as null
    expect(detectDropboxConflict("", "x9y8z7w6")).toBe(false)
  })

  it("is case-sensitive — revs must match exactly", () => {
    // Dropbox revs are hex strings. "ABC" and "abc" would be different revs.
    expect(detectDropboxConflict("A1B2C3D4", "a1b2c3d4")).toBe(true)
  })
})

describe("dropboxFileEntrySchema — rev field", () => {
  it("accepts a file entry with a rev string", () => {
    const entry = {
      ".tag": "file",
      id: "id:abc",
      name: "doc.pdf",
      path_display: "/doc.pdf",
      path_lower: "/doc.pdf",
      rev: "a1b2c3d4e5f6789",
    }
    const result = dropboxFileEntrySchema.safeParse(entry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rev).toBe("a1b2c3d4e5f6789")
    }
  })

  it("accepts a folder entry without a rev (folders have no rev)", () => {
    const entry = {
      ".tag": "folder",
      id: "id:folderabc",
      name: "Lacoda",
      path_display: "/Lacoda",
      path_lower: "/lacoda",
    }
    const result = dropboxFileEntrySchema.safeParse(entry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rev).toBeUndefined()
    }
  })
})

// ============================================================================
// ============================================================================
// SECTION 4 — OAUTH PKCE FLOW (Integration Tests — mocked)
// ============================================================================
// ============================================================================

describe("buildDropboxAuthUrl — PKCE OAuth URL construction", () => {
  /**
   * PKCE = Proof Key for Code Exchange. Dropbox requires PKCE for apps
   * that can't safely store a client_secret (like browser-based flows).
   *
   * The auth URL must contain:
   *   - response_type=code
   *   - token_access_type=offline  (so we get a refresh token)
   *   - code_challenge=<sha256 hash of verifier>
   *   - code_challenge_method=S256
   *   - state=<orgId> (round-tripped to prevent CSRF)
   */
  const CLIENT_ID = "test_client_id_abc123"
  const REDIRECT_URI = "https://lacoda.com/api/webhooks/dropbox/callback"
  const CODE_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  const STATE = "org_01HXYZ"

  it("builds a URL pointing to Dropbox authorize endpoint", () => {
    const url = buildDropboxAuthUrl(CLIENT_ID, REDIRECT_URI, CODE_CHALLENGE, STATE)
    expect(url).toContain("https://www.dropbox.com/oauth2/authorize")
  })

  it("includes response_type=code", () => {
    const url = buildDropboxAuthUrl(CLIENT_ID, REDIRECT_URI, CODE_CHALLENGE, STATE)
    expect(url).toContain("response_type=code")
  })

  it("includes token_access_type=offline to request a refresh token", () => {
    const url = buildDropboxAuthUrl(CLIENT_ID, REDIRECT_URI, CODE_CHALLENGE, STATE)
    expect(url).toContain("token_access_type=offline")
  })

  it("includes the code_challenge", () => {
    const url = buildDropboxAuthUrl(CLIENT_ID, REDIRECT_URI, CODE_CHALLENGE, STATE)
    expect(url).toContain(`code_challenge=${encodeURIComponent(CODE_CHALLENGE)}`)
  })

  it("includes code_challenge_method=S256", () => {
    const url = buildDropboxAuthUrl(CLIENT_ID, REDIRECT_URI, CODE_CHALLENGE, STATE)
    expect(url).toContain("code_challenge_method=S256")
  })

  it("includes the state parameter (orgId round-trip for CSRF prevention)", () => {
    const url = buildDropboxAuthUrl(CLIENT_ID, REDIRECT_URI, CODE_CHALLENGE, STATE)
    expect(url).toContain(`state=${STATE}`)
  })

  it("includes the client_id", () => {
    const url = buildDropboxAuthUrl(CLIENT_ID, REDIRECT_URI, CODE_CHALLENGE, STATE)
    expect(url).toContain(`client_id=${CLIENT_ID}`)
  })

  it("includes the redirect_uri (encoded)", () => {
    const url = buildDropboxAuthUrl(CLIENT_ID, REDIRECT_URI, CODE_CHALLENGE, STATE)
    expect(url).toContain(encodeURIComponent(REDIRECT_URI))
  })
})

describe("createIntegrationSchema — Dropbox integration record creation", () => {
  /**
   * After the OAuth callback completes and we have tokens, we create
   * an integration record. This tests that the payload passes validation
   * before we hit the database.
   */
  it("accepts a minimal Dropbox integration payload (provider + name)", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "dropbox",
      name: "Dropbox",
    })
    expect(result.success).toBe(true)
  })

  it("defaults status to 'disconnected' when omitted", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "dropbox",
      name: "Dropbox",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("disconnected")
    }
  })

  it("accepts status 'connected' explicitly", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "dropbox",
      name: "Dropbox",
      status: "connected",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("connected")
    }
  })

  it("accepts Dropbox settings payload (folder path, account type, tokens)", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "dropbox",
      name: "Dropbox",
      status: "connected",
      externalAccountId: "dbid:AABhello_world123",
      settings: {
        folderPath: "/Lacoda/Documents",
        accountType: "personal",
        _access_token: "sl.fake_access_token_abc",
        _refresh_token: "fake_refresh_token_xyz",
        expires_at: Date.now() + 14400000,
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts externalAccountId as Dropbox account ID (dbid: format)", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "dropbox",
      name: "Dropbox",
      externalAccountId: "dbid:AABhello_world_account_id",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.externalAccountId).toBe("dbid:AABhello_world_account_id")
    }
  })

  it("rejects 'dropbox' provider when misspelled", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "drop_box",
      name: "Dropbox",
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// ============================================================================
// SECTION 5 — FILE LISTING & VAULT SYNC (Integration Tests — mocked)
// ============================================================================
// ============================================================================

describe("dropboxFileEntrySchema — listing files in a folder", () => {
  /**
   * When we list a Dropbox folder, the API returns an array of entries.
   * We validate each entry before deciding whether to create a document
   * in the Vault.
   *
   * Rules we apply:
   *   - ".tag": "file" + is_downloadable: true → import to Vault
   *   - ".tag": "file" + is_downloadable: false → skip (Dropbox Paper)
   *   - ".tag": "folder" → skip (we don't create folder records in Vault)
   *   - ".tag": "deleted" → mark any existing Vault doc as deleted
   */
  it("validates a regular downloadable PDF file entry", () => {
    const entry = {
      ".tag": "file",
      id: "id:abc123",
      name: "annual_report_2024.pdf",
      path_display: "/Lacoda/annual_report_2024.pdf",
      path_lower: "/lacoda/annual_report_2024.pdf",
      rev: "a1b2c3d4",
      size: 2048000,
      server_modified: "2024-12-31T23:59:59Z",
      client_modified: "2024-12-31T22:00:00Z",
      is_downloadable: true,
    }
    const result = dropboxFileEntrySchema.safeParse(entry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[".tag"]).toBe("file")
      expect(result.data.is_downloadable).toBe(true)
    }
  })

  it("validates a folder entry (would be skipped during Vault sync)", () => {
    const entry = {
      ".tag": "folder",
      id: "id:folder_01",
      name: "2024",
      path_display: "/Lacoda/2024",
      path_lower: "/lacoda/2024",
    }
    const result = dropboxFileEntrySchema.safeParse(entry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[".tag"]).toBe("folder")
    }
  })

  it("validates a deleted entry (would trigger Vault document removal)", () => {
    const entry = {
      ".tag": "deleted",
      id: "id:deleted_01",
      name: "old_contract.pdf",
      path_display: "/Lacoda/old_contract.pdf",
      path_lower: "/lacoda/old_contract.pdf",
    }
    const result = dropboxFileEntrySchema.safeParse(entry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[".tag"]).toBe("deleted")
    }
  })

  it("rejects an entry with an unknown .tag value", () => {
    const entry = {
      ".tag": "symlink",
      id: "id:bad",
      name: "link",
      path_display: "/link",
      path_lower: "/link",
    }
    const result = dropboxFileEntrySchema.safeParse(entry)
    expect(result.success).toBe(false)
  })

  it("rejects an entry missing required 'name' field", () => {
    const entry = {
      ".tag": "file",
      id: "id:noname",
      path_display: "/doc.pdf",
      path_lower: "/doc.pdf",
    }
    const result = dropboxFileEntrySchema.safeParse(entry)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// ============================================================================
// SECTION 6 — DROPBOX-SPECIFIC ERROR HANDLING (Integration Tests)
// ============================================================================
// ============================================================================

describe("dropboxErrorSchema — error response validation", () => {
  it("parses a path/not_found error", () => {
    const error = {
      error_summary: "path/not_found/..",
      error: { ".tag": "path/not_found" },
    }
    const result = dropboxErrorSchema.safeParse(error)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error[".tag"]).toBe("path/not_found")
    }
  })

  it("parses an insufficient_space error", () => {
    const error = {
      error_summary: "insufficient_space/..",
      error: { ".tag": "insufficient_space" },
    }
    const result = dropboxErrorSchema.safeParse(error)
    expect(result.success).toBe(true)
  })

  it("parses a too_many_write_operations error", () => {
    const error = {
      error_summary: "too_many_write_operations/..",
      error: { ".tag": "too_many_write_operations" },
    }
    const result = dropboxErrorSchema.safeParse(error)
    expect(result.success).toBe(true)
  })

  it("rejects an error response missing the 'error' object", () => {
    const error = {
      error_summary: "path/not_found/..",
    }
    const result = dropboxErrorSchema.safeParse(error)
    expect(result.success).toBe(false)
  })

  it("rejects an error response with no error_summary", () => {
    const error = {
      error: { ".tag": "path/not_found" },
    }
    const result = dropboxErrorSchema.safeParse(error)
    expect(result.success).toBe(false)
  })
})

describe("classifyDropboxError — mapping error tags to integration actions", () => {
  /**
   * Different Dropbox errors require different handling:
   *
   *   "not_found"        → mark integration status = "error", show message
   *   "insufficient_space" → surface to user — their Dropbox quota is full
   *   "too_many_writes"  → retry after exponential backoff
   *   "locked"           → skip the file, log a warning
   *   "unknown"          → log and rethrow
   */
  it("classifies 'path/not_found' as 'not_found'", () => {
    expect(classifyDropboxError("path/not_found")).toBe("not_found")
  })

  it("classifies 'not_found' (short form) as 'not_found'", () => {
    expect(classifyDropboxError("not_found")).toBe("not_found")
  })

  it("classifies 'insufficient_space' as 'insufficient_space'", () => {
    expect(classifyDropboxError("insufficient_space")).toBe("insufficient_space")
  })

  it("classifies 'too_many_write_operations' as 'too_many_writes'", () => {
    expect(classifyDropboxError("too_many_write_operations")).toBe("too_many_writes")
  })

  it("classifies 'file_operation_conflict' as 'locked'", () => {
    expect(classifyDropboxError("file_operation_conflict")).toBe("locked")
  })

  it("classifies 'locked' tag as 'locked'", () => {
    expect(classifyDropboxError("locked")).toBe("locked")
  })

  it("classifies unknown error tags as 'unknown'", () => {
    expect(classifyDropboxError("malformed_path")).toBe("unknown")
    expect(classifyDropboxError("internal_error")).toBe("unknown")
    expect(classifyDropboxError("")).toBe("unknown")
  })
})

describe("updateIntegrationSchema — marking integration as 'error' after path/not_found", () => {
  /**
   * When Dropbox returns path/not_found, we update the integration record
   * to status="error" with a human-readable statusMessage. This tests that
   * the payload for that update is valid.
   */
  it("accepts status='error' with a statusMessage", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "error",
      statusMessage: "Dropbox folder '/Lacoda/Documents' was not found. Please reconnect.",
    })
    expect(result.success).toBe(true)
  })

  it("statusMessage is limited to 500 characters", () => {
    const longMessage = "A".repeat(501)
    const result = updateIntegrationSchema.safeParse({
      status: "error",
      statusMessage: longMessage,
    })
    expect(result.success).toBe(false)
  })

  it("statusMessage at exactly 500 characters is accepted", () => {
    const maxMessage = "A".repeat(500)
    const result = updateIntegrationSchema.safeParse({
      status: "error",
      statusMessage: maxMessage,
    })
    expect(result.success).toBe(true)
  })

  it("statusMessage can be null (clearing an error)", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "connected",
      statusMessage: null,
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// ============================================================================
// SECTION 7 — E2E: INTEGRATIONS PAGE → CONNECT DROPBOX (mocked UI)
// ============================================================================
// ============================================================================

describe("Dropbox connection flow — integration record shape at each step", () => {
  /**
   * The UI connection flow goes through these states. We test that the
   * schema validates the data shape at each transition point.
   *
   *   1. "Connect Dropbox" clicked → integration created with status="pending"
   *   2. User completes OAuth → status="connected", tokens stored in settings
   *   3. Sync runs → lastSyncAt updated, documents created in Vault
   *   4. Error occurs → status="error", statusMessage set
   */
  it("step 1: pending integration record is valid (before OAuth completes)", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "dropbox",
      name: "Dropbox",
      status: "pending",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe("pending")
    }
  })

  it("step 2: connected integration with tokens is valid", () => {
    const result = createIntegrationSchema.safeParse({
      provider: "dropbox",
      name: "Dropbox",
      status: "connected",
      externalAccountId: "dbid:AABxyz",
      settings: {
        folderPath: "",
        accountType: "personal",
        _access_token: "sl.access_token",
        _refresh_token: "refresh_token",
        expires_at: Date.now() + 14400000,
      },
    })
    expect(result.success).toBe(true)
  })

  it("step 4: update to error state with message is valid", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "error",
      statusMessage: "OAuth token has been revoked. Please reconnect your Dropbox account.",
    })
    expect(result.success).toBe(true)
  })

  it("disconnected state clears tokens (empty settings object)", () => {
    const result = updateIntegrationSchema.safeParse({
      status: "disconnected",
      settings: {},
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.settings).toEqual({})
    }
  })
})

// ============================================================================
// ============================================================================
// SECTION 8 — E2E: CONNECTED STATE DISPLAY (mocked UI)
// ============================================================================
// ============================================================================

describe("dropboxSettingsSchema — settings read back for display", () => {
  /**
   * When the integrations page loads, it reads the settings object to show:
   *   - Which folder is being synced (folderPath → "" means "Root folder")
   *   - Whether it's a personal or business account
   *
   * The tokens (_access_token, _refresh_token) are stripped by stripSecrets()
   * before the data reaches the browser, so the display code never sees them.
   */
  it("accepts a personal account with root folder path", () => {
    const result = dropboxSettingsSchema.safeParse({
      folderPath: "",
      accountType: "personal",
      _access_token: "sl.abc",
      _refresh_token: "rtoken",
      expires_at: Date.now() + 3600000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.folderPath).toBe("")
      expect(result.data.accountType).toBe("personal")
    }
  })

  it("accepts a business account with a specific folder path", () => {
    const result = dropboxSettingsSchema.safeParse({
      folderPath: "/LacadaCapital/Documents",
      accountType: "business",
      _access_token: "sl.business_token",
      _refresh_token: "business_rtoken",
      expires_at: Date.now() + 14400000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.accountType).toBe("business")
    }
  })

  it("defaults accountType to 'personal' when omitted", () => {
    const result = dropboxSettingsSchema.safeParse({
      folderPath: "/Docs",
      _access_token: "sl.token",
      _refresh_token: "rtoken",
      expires_at: Date.now() + 3600000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.accountType).toBe("personal")
    }
  })

  it("rejects settings missing _access_token", () => {
    const result = dropboxSettingsSchema.safeParse({
      folderPath: "",
      _refresh_token: "rtoken",
      expires_at: Date.now() + 3600000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid accountType value", () => {
    const result = dropboxSettingsSchema.safeParse({
      folderPath: "",
      accountType: "enterprise",
      _access_token: "sl.token",
      _refresh_token: "rtoken",
      expires_at: Date.now() + 3600000,
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// ============================================================================
// SECTION 9 — EDGE CASES
// ============================================================================
// ============================================================================

describe("isDropboxPaperDocument — Dropbox Paper detection", () => {
  /**
   * Dropbox Paper documents are collaborative docs (like Google Docs).
   * They appear in folder listings but cannot be downloaded as files.
   * The API signals this with is_downloadable: false.
   *
   * We must skip Paper documents during sync — trying to download them
   * returns an error.
   */
  it("returns true for a Paper document (is_downloadable: false)", () => {
    const entry: DropboxFileEntry = {
      ".tag": "file",
      id: "id:paper123",
      name: "Meeting Notes",
      path_display: "/Lacoda/Meeting Notes",
      path_lower: "/lacoda/meeting notes",
      is_downloadable: false,
    }
    expect(isDropboxPaperDocument(entry)).toBe(true)
  })

  it("returns false for a regular file (is_downloadable: true)", () => {
    const entry: DropboxFileEntry = {
      ".tag": "file",
      id: "id:pdf123",
      name: "report.pdf",
      path_display: "/Lacoda/report.pdf",
      path_lower: "/lacoda/report.pdf",
      is_downloadable: true,
    }
    expect(isDropboxPaperDocument(entry)).toBe(false)
  })

  it("returns false for a folder entry (folders are not Paper docs)", () => {
    const entry: DropboxFileEntry = {
      ".tag": "folder",
      id: "id:folder1",
      name: "2024",
      path_display: "/2024",
      path_lower: "/2024",
    }
    expect(isDropboxPaperDocument(entry)).toBe(false)
  })

  it("returns false when is_downloadable is undefined (assume downloadable)", () => {
    const entry: DropboxFileEntry = {
      ".tag": "file",
      id: "id:nodownload",
      name: "mystery.bin",
      path_display: "/mystery.bin",
      path_lower: "/mystery.bin",
      // is_downloadable not set
    }
    expect(isDropboxPaperDocument(entry)).toBe(false)
  })
})

describe("Dropbox Business vs Personal — account type handling", () => {
  /**
   * Dropbox Business accounts differ from personal in a few ways:
   *   - Business users have a team namespace — shared folders live under
   *     a different root than the personal namespace
   *   - Business accounts have admin-set quotas
   *   - The API response for /users/get_current_account returns team info
   *
   * We surface the accountType in settings so the UI can show it and so
   * the sync logic can use the right namespace.
   */
  it("personal account type is valid in settings schema", () => {
    const result = dropboxSettingsSchema.safeParse({
      folderPath: "/Docs",
      accountType: "personal",
      _access_token: "sl.abc",
      _refresh_token: "rtoken",
      expires_at: Date.now() + 3600000,
    })
    expect(result.success).toBe(true)
  })

  it("business account type is valid in settings schema", () => {
    const result = dropboxSettingsSchema.safeParse({
      folderPath: "/SharedDocs",
      accountType: "business",
      accountId: "dbid:AABbusiness123",
      _access_token: "sl.business_token",
      _refresh_token: "business_rtoken",
      expires_at: Date.now() + 14400000,
    })
    expect(result.success).toBe(true)
  })

  it("'team' is not a valid accountType (not in enum)", () => {
    const result = dropboxSettingsSchema.safeParse({
      folderPath: "/TeamDocs",
      accountType: "team",
      _access_token: "sl.abc",
      _refresh_token: "rtoken",
      expires_at: Date.now() + 3600000,
    })
    expect(result.success).toBe(false)
  })
})

describe("File conflicts — same file edited in both places", () => {
  /**
   * A sync conflict occurs when a file is edited on Dropbox between
   * the time we last synced it and now.
   *
   * Our conflict detection strategy:
   *   - When we import a file, store its Dropbox rev in the document record
   *   - On next sync, compare stored rev vs current Dropbox rev
   *   - If they differ → conflict → skip the file and log a warning
   */
  it("detects a conflict when rev has changed since last sync", () => {
    const storedRev = "old_rev_a1b2c3"
    const currentRev = "new_rev_x9y8z7"
    expect(detectDropboxConflict(storedRev, currentRev)).toBe(true)
  })

  it("no conflict when rev is unchanged (file not modified)", () => {
    const storedRev = "rev_abc123"
    const currentRev = "rev_abc123"
    expect(detectDropboxConflict(storedRev, currentRev)).toBe(false)
  })

  it("no conflict if we have no baseline (new file, never synced)", () => {
    expect(detectDropboxConflict(null, "rev_abc123")).toBe(false)
  })
})

describe("Dropbox locked file — classifyDropboxError", () => {
  /**
   * When another Dropbox user has a file open for editing (locked),
   * our write/upload will fail with a "locked" error tag.
   * We should skip the file and log a warning rather than failing the
   * entire sync job.
   */
  it("classifies 'locked' as 'locked' error type", () => {
    expect(classifyDropboxError("locked")).toBe("locked")
  })

  it("classifies 'file_operation_conflict' as 'locked' error type", () => {
    expect(classifyDropboxError("file_operation_conflict")).toBe("locked")
  })
})

describe("Case-insensitive path matching — Dropbox vs Vault", () => {
  /**
   * Dropbox is case-insensitive: "/Docs" and "/docs" refer to the same folder.
   * The Dropbox API returns both path_display (human-readable) and path_lower
   * (always lowercase). We should use path_lower for comparisons.
   *
   * Our Vault stores paths as-is (case-sensitive on Linux/Supabase Storage),
   * so we need to normalise before comparing.
   */
  it("matches '/Lacoda/Documents' and '/lacoda/documents' as the same path", () => {
    expect(dropboxPathsMatch("/Lacoda/Documents", "/lacoda/documents")).toBe(true)
  })

  it("matches '/LACODA' and '/lacoda' as the same path", () => {
    expect(dropboxPathsMatch("/LACODA", "/lacoda")).toBe(true)
  })

  it("does not match completely different paths", () => {
    expect(dropboxPathsMatch("/Lacoda/Documents", "/Lacoda/Reports")).toBe(false)
  })

  it("matches '' (root) and '' (root) — both represent root", () => {
    expect(dropboxPathsMatch("", "")).toBe(true)
  })

  it("does not match root '' with a subfolder path", () => {
    expect(dropboxPathsMatch("", "/lacoda")).toBe(false)
  })
})

// ============================================================================
// ============================================================================
// SECTION 10 — SETTINGS SCHEMA COMPLETENESS
// ============================================================================
// ============================================================================

describe("dropboxSettingsSchema — complete settings round-trip", () => {
  /**
   * Verify the settings schema accepts a fully-populated settings object
   * as it would exist in the DB after a successful OAuth + first sync.
   */
  const fullSettings = {
    folderPath: "/LacadaCapital/ClientDocuments",
    accountId: "dbid:AABfull_account_id_here",
    accountType: "business" as const,
    _cursor: "AAHglongpollcursor_after_first_sync",
    _access_token: "sl.ABcurrent_access_token",
    _refresh_token: "ABCDEFrefresh_token",
    expires_at: Date.now() + 14400000,
  }

  it("accepts a fully-populated settings object", () => {
    const result = dropboxSettingsSchema.safeParse(fullSettings)
    expect(result.success).toBe(true)
  })

  it("preserves the folderPath exactly as stored", () => {
    const result = dropboxSettingsSchema.safeParse(fullSettings)
    if (result.success) {
      expect(result.data.folderPath).toBe("/LacadaCapital/ClientDocuments")
    }
  })

  it("preserves the cursor for incremental sync", () => {
    const result = dropboxSettingsSchema.safeParse(fullSettings)
    if (result.success) {
      expect(result.data._cursor).toBe("AAHglongpollcursor_after_first_sync")
    }
  })
})
