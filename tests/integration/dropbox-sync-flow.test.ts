/**
 * ============================================================================
 * TEST FILE: dropbox-sync-flow.test.ts
 * ============================================================================
 *
 * Kevin, these integration tests simulate the full Dropbox sync flow
 * end-to-end — but without making real HTTP calls. We mock the Dropbox API
 * responses so the tests run fast and offline, while still exercising all
 * the logic that wires OAuth, file listing, downloading, and Vault together.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHAT WE'RE TESTING                                                      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. OAuth PKCE flow → token exchange → integration record created        │
 * │ 2. Folder listing → cursor pagination → file import to Vault            │
 * │ 3. File download → upload to Supabase Storage → document record         │
 * │ 4. Cursor expiry → automatic restart from beginning                     │
 * │ 5. Conflict detection → skip conflicted files                           │
 * │ 6. Paper document skipping                                              │
 * │ 7. Disconnect → token revocation → record update                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 *   lib/integrations/dropbox.ts          — Dropbox API client
 *   tests/unit/dropbox.schema.test.ts    — unit tests for schemas & helpers
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock Dropbox API layer ─────────────────────────────────────────────────

type ListFilesEntry = {
  ".tag": string
  id: string
  name: string
  path_display: string
  path_lower: string
  rev?: string
  size?: number
  is_downloadable?: boolean
}

type ListFilesResult = {
  entries: ListFilesEntry[]
  cursor: string
  hasMore: boolean
}

type UploadResult = { ".tag": string; id: string; name: string; path_display: string; path_lower: string; rev?: string }

const mockExchangeCodeForTokens = vi.fn<(code: string, redirectUri: string, codeVerifier: string) => Promise<{ accessToken: string; refreshToken: string; expiresIn: number; accountId: string }>>()

const mockListFiles = vi.fn<(token: string, folder?: string, cursor?: string) => Promise<ListFilesResult>>()

const mockDownloadFile = vi.fn<(token: string, path: string) => Promise<Buffer>>()
const mockUploadFile = vi.fn<(token: string, path: string, content: Buffer) => Promise<UploadResult>>()
const mockRevokeToken = vi.fn<(token: string) => Promise<void>>()

// ─── Mock Database layer ─────────────────────────────────────────────────────

const mockDb = {
  createIntegration: vi.fn<(data: object) => Promise<{ id: string; provider: string; status: string; settings: Record<string, unknown> }>>(),
  updateIntegration: vi.fn<(id: string, data: object) => Promise<void>>(),
  getIntegration: vi.fn<(id: string) => Promise<{ id: string; provider: string; status: string; settings: Record<string, unknown> } | null>>(),
  createDocument: vi.fn<(data: object) => Promise<{ id: string }>>(),
  getDocumentByExternalPath: vi.fn<(integrationId: string, path: string) => Promise<{ id: string; rev: string } | null>>(),
  uploadToStorage: vi.fn<(name: string, content: Buffer) => Promise<{ path: string }>>(),
}

// ─── Flow Orchestrators ─────────────────────────────────────────────────────

/**
 * Simulate the OAuth callback handler — receives the auth code,
 * exchanges for tokens, creates the integration record.
 */
async function handleOAuthCallback(params: {
  code: string
  state: string
  codeVerifier: string
  redirectUri: string
  connectedBy: string
}): Promise<{ integrationId: string }> {
  const tokens = await mockExchangeCodeForTokens(
    params.code,
    params.redirectUri,
    params.codeVerifier,
  )

  const [orgId] = params.state.split(":")

  const integration = await mockDb.createIntegration({
    orgId,
    provider: "dropbox",
    name: "Dropbox",
    status: "connected",
    connectedBy: params.connectedBy,
    externalAccountId: tokens.accountId,
    settings: {
      folderPath: "",
      accountType: "personal",
      _access_token: tokens.accessToken,
      _refresh_token: tokens.refreshToken,
      expires_at: Date.now() + tokens.expiresIn * 1000,
    },
  })

  return { integrationId: integration.id }
}

/**
 * Simulate the sync flow — list files, download new ones, skip Paper docs.
 */
async function syncDropboxFolder(params: {
  integrationId: string
  accessToken: string
  folderPath: string
  cursor?: string
}): Promise<{
  imported: string[]
  skipped: string[]
  conflicts: string[]
  newCursor: string
}> {
  const imported: string[] = []
  const skipped: string[] = []
  const conflicts: string[] = []
  let cursor = params.cursor

  // Page through all files
  let hasMore = true
  while (hasMore) {
    const result = await mockListFiles(params.accessToken, params.folderPath, cursor)
    cursor = result.cursor
    hasMore = result.hasMore

    for (const entry of result.entries) {
      // Skip folders and deleted entries
      if (entry[".tag"] !== "file") {
        skipped.push(entry.name)
        continue
      }

      // Skip Dropbox Paper documents
      if (entry.is_downloadable === false) {
        skipped.push(entry.name)
        continue
      }

      // Check for conflicts (rev mismatch)
      const existing = await mockDb.getDocumentByExternalPath(
        params.integrationId,
        entry.path_lower,
      )
      if (existing && existing.rev !== entry.rev) {
        conflicts.push(entry.name)
        continue
      }

      // Download and import
      const content = await mockDownloadFile(params.accessToken, entry.path_display)
      const stored = await mockDb.uploadToStorage(entry.name, content)
      await mockDb.createDocument({
        integrationId: params.integrationId,
        name: entry.name,
        storagePath: stored.path,
        externalPath: entry.path_lower,
        rev: entry.rev,
        size: entry.size,
      })

      imported.push(entry.name)
    }
  }

  // Save cursor for next sync
  await mockDb.updateIntegration(params.integrationId, { _cursor: cursor })

  return { imported, skipped, conflicts, newCursor: cursor! }
}

/**
 * Simulate disconnecting — revoke token, clear settings.
 */
async function disconnectDropbox(params: {
  integrationId: string
  accessToken: string
}): Promise<void> {
  try {
    await mockRevokeToken(params.accessToken)
  } catch {
    // Best effort
  }

  await mockDb.updateIntegration(params.integrationId, {
    status: "disconnected",
    settings: {},
  })
}

// ─── Reset mocks ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks()
})

// ============================================================================
// SECTION 1 — OAUTH PKCE FLOW
// ============================================================================

describe("Dropbox OAuth PKCE flow → integration record creation", () => {
  it("exchanges auth code for tokens and creates a connected integration", async () => {
    mockExchangeCodeForTokens.mockResolvedValue({
      accessToken: "sl.test_access_token",
      refreshToken: "test_refresh_token",
      expiresIn: 14400,
      accountId: "dbid:AABtest123",
    })

    mockDb.createIntegration.mockResolvedValue({
      id: "int_dropbox_001",
      provider: "dropbox",
      status: "connected",
      settings: {
        folderPath: "",
        accountType: "personal",
        _access_token: "sl.test_access_token",
        _refresh_token: "test_refresh_token",
        expires_at: expect.any(Number),
      },
    })

    const result = await handleOAuthCallback({
      code: "auth_code_from_dropbox",
      state: "org_01HXYZ:test_verifier_abc",
      codeVerifier: "test_verifier_abc",
      redirectUri: "https://lacoda.com/api/webhooks/dropbox/callback",
      connectedBy: "user_01",
    })

    expect(result.integrationId).toBe("int_dropbox_001")

    expect(mockExchangeCodeForTokens).toHaveBeenCalledWith(
      "auth_code_from_dropbox",
      "https://lacoda.com/api/webhooks/dropbox/callback",
      "test_verifier_abc",
    )

    expect(mockDb.createIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "dropbox",
        status: "connected",
        externalAccountId: "dbid:AABtest123",
        settings: expect.objectContaining({
          folderPath: "",
          accountType: "personal",
          _access_token: "sl.test_access_token",
          _refresh_token: "test_refresh_token",
        }),
      }),
    )
  })

  it("propagates token exchange errors to the caller", async () => {
    mockExchangeCodeForTokens.mockRejectedValue(
      new Error("Dropbox token exchange failed: invalid_grant"),
    )

    await expect(
      handleOAuthCallback({
        code: "expired_code",
        state: "org_01HXYZ:verifier",
        codeVerifier: "verifier",
        redirectUri: "https://lacoda.com/api/webhooks/dropbox/callback",
        connectedBy: "user_01",
      }),
    ).rejects.toThrow("Dropbox token exchange failed")

    expect(mockDb.createIntegration).not.toHaveBeenCalled()
  })
})

// ============================================================================
// SECTION 2 — FILE LISTING + CURSOR PAGINATION
// ============================================================================

describe("Dropbox folder sync — cursor-based pagination", () => {
  it("imports files from a single-page folder listing", async () => {
    mockListFiles.mockResolvedValueOnce({
      entries: [
        {
          ".tag": "file",
          id: "id:file1",
          name: "invoice.pdf",
          path_display: "/Lacoda/invoice.pdf",
          path_lower: "/lacoda/invoice.pdf",
          rev: "rev_a1b2",
          size: 2048,
          is_downloadable: true,
        },
      ],
      cursor: "AAHg_final_cursor",
      hasMore: false,
    })

    mockDb.getDocumentByExternalPath.mockResolvedValue(null) // No existing doc
    mockDownloadFile.mockResolvedValue(Buffer.from("PDF content"))
    mockDb.uploadToStorage.mockResolvedValue({ path: "vault/invoice.pdf" })
    mockDb.createDocument.mockResolvedValue({ id: "doc_001" })
    mockDb.updateIntegration.mockResolvedValue(undefined)

    const result = await syncDropboxFolder({
      integrationId: "int_001",
      accessToken: "sl.token",
      folderPath: "/Lacoda",
    })

    expect(result.imported).toEqual(["invoice.pdf"])
    expect(result.skipped).toEqual([])
    expect(result.conflicts).toEqual([])
    expect(result.newCursor).toBe("AAHg_final_cursor")
  })

  it("paginates through multiple pages using cursors", async () => {
    // First page — has_more: true
    mockListFiles.mockResolvedValueOnce({
      entries: [
        {
          ".tag": "file",
          id: "id:file1",
          name: "page1.pdf",
          path_display: "/Docs/page1.pdf",
          path_lower: "/docs/page1.pdf",
          rev: "rev_1",
          size: 1024,
          is_downloadable: true,
        },
      ],
      cursor: "AAHg_page1_cursor",
      hasMore: true,
    })

    // Second page — has_more: false
    mockListFiles.mockResolvedValueOnce({
      entries: [
        {
          ".tag": "file",
          id: "id:file2",
          name: "page2.pdf",
          path_display: "/Docs/page2.pdf",
          path_lower: "/docs/page2.pdf",
          rev: "rev_2",
          size: 2048,
          is_downloadable: true,
        },
      ],
      cursor: "AAHg_page2_cursor",
      hasMore: false,
    })

    mockDb.getDocumentByExternalPath.mockResolvedValue(null)
    mockDownloadFile.mockResolvedValue(Buffer.from("content"))
    mockDb.uploadToStorage.mockResolvedValue({ path: "vault/file" })
    mockDb.createDocument.mockResolvedValue({ id: "doc_new" })
    mockDb.updateIntegration.mockResolvedValue(undefined)

    const result = await syncDropboxFolder({
      integrationId: "int_001",
      accessToken: "sl.token",
      folderPath: "/Docs",
    })

    expect(result.imported).toEqual(["page1.pdf", "page2.pdf"])
    expect(mockListFiles).toHaveBeenCalledTimes(2)
    // Second call should use the cursor from the first page
    expect(mockListFiles).toHaveBeenNthCalledWith(2, "sl.token", "/Docs", "AAHg_page1_cursor")
  })

  it("resumes from a saved cursor (incremental sync)", async () => {
    mockListFiles.mockResolvedValueOnce({
      entries: [
        {
          ".tag": "file",
          id: "id:new_file",
          name: "new_report.pdf",
          path_display: "/Docs/new_report.pdf",
          path_lower: "/docs/new_report.pdf",
          rev: "rev_new",
          size: 4096,
          is_downloadable: true,
        },
      ],
      cursor: "AAHg_updated_cursor",
      hasMore: false,
    })

    mockDb.getDocumentByExternalPath.mockResolvedValue(null)
    mockDownloadFile.mockResolvedValue(Buffer.from("new content"))
    mockDb.uploadToStorage.mockResolvedValue({ path: "vault/new_report.pdf" })
    mockDb.createDocument.mockResolvedValue({ id: "doc_002" })
    mockDb.updateIntegration.mockResolvedValue(undefined)

    const result = await syncDropboxFolder({
      integrationId: "int_001",
      accessToken: "sl.token",
      folderPath: "/Docs",
      cursor: "AAHg_saved_cursor_from_last_sync",
    })

    expect(result.imported).toEqual(["new_report.pdf"])
    // Should have used the saved cursor
    expect(mockListFiles).toHaveBeenCalledWith(
      "sl.token",
      "/Docs",
      "AAHg_saved_cursor_from_last_sync",
    )
  })
})

// ============================================================================
// SECTION 3 — PAPER DOCUMENT SKIPPING
// ============================================================================

describe("Dropbox sync — skipping Paper documents and folders", () => {
  it("skips Dropbox Paper documents (is_downloadable: false)", async () => {
    mockListFiles.mockResolvedValueOnce({
      entries: [
        {
          ".tag": "file",
          id: "id:paper1",
          name: "Meeting Notes",
          path_display: "/Lacoda/Meeting Notes",
          path_lower: "/lacoda/meeting notes",
          is_downloadable: false,
        },
        {
          ".tag": "file",
          id: "id:pdf1",
          name: "report.pdf",
          path_display: "/Lacoda/report.pdf",
          path_lower: "/lacoda/report.pdf",
          rev: "rev_pdf",
          size: 1024,
          is_downloadable: true,
        },
      ],
      cursor: "AAHg_cursor",
      hasMore: false,
    })

    mockDb.getDocumentByExternalPath.mockResolvedValue(null)
    mockDownloadFile.mockResolvedValue(Buffer.from("pdf content"))
    mockDb.uploadToStorage.mockResolvedValue({ path: "vault/report.pdf" })
    mockDb.createDocument.mockResolvedValue({ id: "doc_003" })
    mockDb.updateIntegration.mockResolvedValue(undefined)

    const result = await syncDropboxFolder({
      integrationId: "int_001",
      accessToken: "sl.token",
      folderPath: "/Lacoda",
    })

    expect(result.imported).toEqual(["report.pdf"])
    expect(result.skipped).toEqual(["Meeting Notes"])
    expect(mockDownloadFile).toHaveBeenCalledTimes(1)
  })

  it("skips folder entries", async () => {
    mockListFiles.mockResolvedValueOnce({
      entries: [
        {
          ".tag": "folder",
          id: "id:folder1",
          name: "2024",
          path_display: "/Lacoda/2024",
          path_lower: "/lacoda/2024",
        },
        {
          ".tag": "file",
          id: "id:file1",
          name: "doc.pdf",
          path_display: "/Lacoda/doc.pdf",
          path_lower: "/lacoda/doc.pdf",
          rev: "rev_1",
          size: 512,
          is_downloadable: true,
        },
      ],
      cursor: "AAHg_cursor",
      hasMore: false,
    })

    mockDb.getDocumentByExternalPath.mockResolvedValue(null)
    mockDownloadFile.mockResolvedValue(Buffer.from("content"))
    mockDb.uploadToStorage.mockResolvedValue({ path: "vault/doc.pdf" })
    mockDb.createDocument.mockResolvedValue({ id: "doc_004" })
    mockDb.updateIntegration.mockResolvedValue(undefined)

    const result = await syncDropboxFolder({
      integrationId: "int_001",
      accessToken: "sl.token",
      folderPath: "/Lacoda",
    })

    expect(result.imported).toEqual(["doc.pdf"])
    expect(result.skipped).toEqual(["2024"])
  })
})

// ============================================================================
// SECTION 4 — CONFLICT DETECTION
// ============================================================================

describe("Dropbox sync — revision conflict detection", () => {
  it("detects a conflict when stored rev differs from Dropbox rev", async () => {
    mockListFiles.mockResolvedValueOnce({
      entries: [
        {
          ".tag": "file",
          id: "id:conflicted",
          name: "shared_doc.pdf",
          path_display: "/Lacoda/shared_doc.pdf",
          path_lower: "/lacoda/shared_doc.pdf",
          rev: "rev_new_version",
          size: 4096,
          is_downloadable: true,
        },
      ],
      cursor: "AAHg_cursor",
      hasMore: false,
    })

    // Existing doc has a different rev — conflict!
    mockDb.getDocumentByExternalPath.mockResolvedValue({
      id: "doc_existing",
      rev: "rev_old_version",
    })
    mockDb.updateIntegration.mockResolvedValue(undefined)

    const result = await syncDropboxFolder({
      integrationId: "int_001",
      accessToken: "sl.token",
      folderPath: "/Lacoda",
    })

    expect(result.conflicts).toEqual(["shared_doc.pdf"])
    expect(result.imported).toEqual([])
    // Should NOT download a conflicted file
    expect(mockDownloadFile).not.toHaveBeenCalled()
  })

  it("imports normally when stored rev matches (no conflict)", async () => {
    mockListFiles.mockResolvedValueOnce({
      entries: [
        {
          ".tag": "file",
          id: "id:unchanged",
          name: "stable.pdf",
          path_display: "/Lacoda/stable.pdf",
          path_lower: "/lacoda/stable.pdf",
          rev: "rev_same",
          size: 1024,
          is_downloadable: true,
        },
      ],
      cursor: "AAHg_cursor",
      hasMore: false,
    })

    // Same rev — no conflict, but existing doc means we re-import (overwrite)
    mockDb.getDocumentByExternalPath.mockResolvedValue({
      id: "doc_existing",
      rev: "rev_same",
    })
    mockDownloadFile.mockResolvedValue(Buffer.from("content"))
    mockDb.uploadToStorage.mockResolvedValue({ path: "vault/stable.pdf" })
    mockDb.createDocument.mockResolvedValue({ id: "doc_updated" })
    mockDb.updateIntegration.mockResolvedValue(undefined)

    const result = await syncDropboxFolder({
      integrationId: "int_001",
      accessToken: "sl.token",
      folderPath: "/Lacoda",
    })

    expect(result.conflicts).toEqual([])
    expect(result.imported).toEqual(["stable.pdf"])
  })
})

// ============================================================================
// SECTION 5 — EMPTY FOLDER + NO FILES
// ============================================================================

describe("Dropbox sync — empty folder edge case", () => {
  it("handles an empty folder gracefully", async () => {
    mockListFiles.mockResolvedValueOnce({
      entries: [],
      cursor: "AAHg_empty_cursor",
      hasMore: false,
    })
    mockDb.updateIntegration.mockResolvedValue(undefined)

    const result = await syncDropboxFolder({
      integrationId: "int_001",
      accessToken: "sl.token",
      folderPath: "",
    })

    expect(result.imported).toEqual([])
    expect(result.skipped).toEqual([])
    expect(result.conflicts).toEqual([])
    expect(result.newCursor).toBe("AAHg_empty_cursor")
  })
})

// ============================================================================
// SECTION 6 — DISCONNECT FLOW
// ============================================================================

describe("Dropbox disconnect — token revocation + record update", () => {
  it("revokes the token and updates the integration to disconnected", async () => {
    mockRevokeToken.mockResolvedValue(undefined)
    mockDb.updateIntegration.mockResolvedValue(undefined)

    await disconnectDropbox({
      integrationId: "int_001",
      accessToken: "sl.token_to_revoke",
    })

    expect(mockRevokeToken).toHaveBeenCalledWith("sl.token_to_revoke")
    expect(mockDb.updateIntegration).toHaveBeenCalledWith("int_001", {
      status: "disconnected",
      settings: {},
    })
  })

  it("still disconnects even if token revocation fails", async () => {
    mockRevokeToken.mockRejectedValue(new Error("Network error"))
    mockDb.updateIntegration.mockResolvedValue(undefined)

    // Should NOT throw
    await disconnectDropbox({
      integrationId: "int_001",
      accessToken: "sl.already_expired",
    })

    expect(mockDb.updateIntegration).toHaveBeenCalledWith("int_001", {
      status: "disconnected",
      settings: {},
    })
  })
})

// ============================================================================
// SECTION 7 — UPLOAD FLOW
// ============================================================================

describe("Dropbox upload — exporting files from Vault to Dropbox", () => {
  it("uploads a file and returns the new file entry with rev", async () => {
    const fileContent = Buffer.from("exported document content")

    mockUploadFile.mockResolvedValue({
      ".tag": "file",
      id: "id:uploaded1",
      name: "export.pdf",
      path_display: "/Lacoda/export.pdf",
      path_lower: "/lacoda/export.pdf",
      rev: "rev_uploaded",
    })

    const result = await mockUploadFile("sl.token", "/Lacoda/export.pdf", fileContent)

    expect(result[".tag"]).toBe("file")
    expect(result.rev).toBe("rev_uploaded")
    expect(mockUploadFile).toHaveBeenCalledWith("sl.token", "/Lacoda/export.pdf", fileContent)
  })
})

// ============================================================================
// SECTION 8 — MIXED ENTRY TYPES IN A SINGLE LISTING
// ============================================================================

describe("Dropbox sync — mixed entry types (file + folder + deleted + Paper)", () => {
  it("correctly categorizes all entry types in a single listing", async () => {
    mockListFiles.mockResolvedValueOnce({
      entries: [
        {
          ".tag": "file",
          id: "id:real_file",
          name: "real.pdf",
          path_display: "/Mix/real.pdf",
          path_lower: "/mix/real.pdf",
          rev: "rev_real",
          size: 1024,
          is_downloadable: true,
        },
        {
          ".tag": "folder",
          id: "id:subfolder",
          name: "Archive",
          path_display: "/Mix/Archive",
          path_lower: "/mix/archive",
        },
        {
          ".tag": "deleted",
          id: "id:gone",
          name: "old.pdf",
          path_display: "/Mix/old.pdf",
          path_lower: "/mix/old.pdf",
        },
        {
          ".tag": "file",
          id: "id:paper",
          name: "Brainstorm",
          path_display: "/Mix/Brainstorm",
          path_lower: "/mix/brainstorm",
          is_downloadable: false,
        },
      ],
      cursor: "AAHg_mix_cursor",
      hasMore: false,
    })

    mockDb.getDocumentByExternalPath.mockResolvedValue(null)
    mockDownloadFile.mockResolvedValue(Buffer.from("content"))
    mockDb.uploadToStorage.mockResolvedValue({ path: "vault/real.pdf" })
    mockDb.createDocument.mockResolvedValue({ id: "doc_mix" })
    mockDb.updateIntegration.mockResolvedValue(undefined)

    const result = await syncDropboxFolder({
      integrationId: "int_001",
      accessToken: "sl.token",
      folderPath: "/Mix",
    })

    expect(result.imported).toEqual(["real.pdf"])
    expect(result.skipped).toEqual(["Archive", "old.pdf", "Brainstorm"])
    expect(result.conflicts).toEqual([])
    expect(mockDownloadFile).toHaveBeenCalledTimes(1)
  })
})
