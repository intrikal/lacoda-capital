/**
 * Dropbox Integration — Document Storage
 *
 * Dropbox handles:
 * - Importing documents from a client's Dropbox folder
 * - Uploading/backing up documents to Dropbox
 * - Browsing Dropbox folders to pick files
 *
 * FLOW:
 *   1. Advisor clicks "Connect Dropbox" → OAuth PKCE consent flow
 *   2. User authorizes file access → we store refresh token
 *   3. Advisor clicks "Import from Dropbox" → picks files → copies to Supabase Storage
 *   4. No webhook needed — import is on-demand
 *
 * KEY DIFFERENCES FROM GOOGLE DRIVE:
 *   - Uses PKCE (Proof Key for Code Exchange) instead of client_secret in the browser
 *   - Identifies folders by human-readable paths ("/Docs") not opaque IDs
 *   - Uses cursor-based pagination (cursors expire after ~7 days)
 *   - File metadata uses a ".tag" discriminator ("file" | "folder" | "deleted")
 *   - Paths are case-insensitive (use path_lower for comparisons)
 *
 * REQUIRED ENV VARS:
 *   DROPBOX_APP_KEY       — from https://www.dropbox.com/developers/apps
 *   DROPBOX_APP_SECRET    — from the same Dropbox App Console page
 */

import crypto from "crypto"
import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

// ─── Schemas ───────────────────────────────────────────────────────────────

export const dropboxSettingsSchema = z.object({
  folderPath: z.string(),
  accountId: z.string().optional(),
  accountType: z.enum(["personal", "business"]).default("personal"),
  _cursor: z.string().optional(),
  _access_token: z.string(),
  _refresh_token: z.string(),
  expires_at: z.number(),
})

export type DropboxSettings = z.infer<typeof dropboxSettingsSchema>

export const dropboxFileEntrySchema = z.object({
  ".tag": z.enum(["file", "folder", "deleted"]),
  id: z.string(),
  name: z.string(),
  path_display: z.string(),
  path_lower: z.string(),
  rev: z.string().optional(),
  size: z.number().optional(),
  server_modified: z.string().optional(),
  client_modified: z.string().optional(),
  is_downloadable: z.boolean().optional(),
})

export type DropboxFileEntry = z.infer<typeof dropboxFileEntrySchema>

export const dropboxListFolderResponseSchema = z.object({
  entries: z.array(dropboxFileEntrySchema),
  cursor: z.string(),
  has_more: z.boolean(),
})

export const dropboxErrorSchema = z.object({
  error_summary: z.string(),
  error: z.object({
    ".tag": z.string(),
  }),
})

// ─── Configuration ──────────────────────────────────────────────────────────

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY ?? ""
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET ?? ""

export function isDropboxConfigured(): boolean {
  return Boolean(DROPBOX_APP_KEY && DROPBOX_APP_SECRET)
}

// ─── Pure Helpers ───────────────────────────────────────────────────────────

/**
 * Normalise a Dropbox folder path so it's always a clean absolute path
 * or empty string (root).
 */
export function normaliseDropboxPath(input: string): string {
  if (input === "" || input === "/") return ""

  let path = input.replace(/\\/g, "/")
  if (!path.startsWith("/")) path = "/" + path
  path = path.replace(/\/+$/, "")

  return path
}

/**
 * Classify a Dropbox error tag into a known category.
 */
export function classifyDropboxError(
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
 */
export function isDropboxPaperDocument(entry: DropboxFileEntry): boolean {
  if (entry[".tag"] !== "file") return false
  return entry.is_downloadable === false
}

/**
 * Detect a conflict between the version we stored and the current version on Dropbox.
 */
export function detectDropboxConflict(storedRev: string | null, currentRev: string): boolean {
  if (!storedRev) return false
  return storedRev !== currentRev
}

/**
 * Check whether two Dropbox paths refer to the same folder, ignoring case.
 */
export function dropboxPathsMatch(pathA: string, pathB: string): boolean {
  return pathA.toLowerCase() === pathB.toLowerCase()
}

// ─── OAuth (PKCE) ──────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random code_verifier for PKCE.
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url")
}

/**
 * Hash a code_verifier to produce a code_challenge (SHA-256, base64url).
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url")
}

/**
 * Build the Dropbox OAuth PKCE authorization URL.
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)

  // Store the verifier so we can use it in the token exchange.
  // In production this would go in a session store or encrypted cookie.
  // For now we append it to the state param (state:verifier), which the
  // callback route will split apart.
  const combinedState = `${state}:${codeVerifier}`

  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    redirect_uri: redirectUri,
    response_type: "code",
    token_access_type: "offline",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: combinedState,
  })

  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; accountId: string }> {
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Dropbox token exchange failed: ${error}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    accountId: data.account_id,
  }
}

/**
 * Refresh an expired access token.
 */
async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
    }).toString(),
  })

  if (!res.ok) throw new Error("Dropbox token refresh failed")

  const data = await res.json()
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

// ─── Dropbox API Helpers ────────────────────────────────────────────────────

/**
 * Get an active access token for a Dropbox integration.
 * Automatically refreshes if the current token is expired.
 */
export async function getAccessToken(integrationId: string): Promise<string> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "dropbox") {
    throw new Error("Dropbox integration not found")
  }

  const settings = integration.settings as Record<string, unknown>
  const expiresAt = settings.expires_at as number
  const refreshToken = settings._refresh_token as string

  // Return existing token if not expired (with 60s buffer)
  if (Date.now() < expiresAt - 60_000) {
    return settings._access_token as string
  }

  // Refresh
  const refreshed = await refreshAccessToken(refreshToken)

  await db
    .update(integrations)
    .set({
      settings: {
        ...settings,
        _access_token: refreshed.accessToken,
        expires_at: Date.now() + refreshed.expiresIn * 1000,
      },
    })
    .where(eq(integrations.id, integrationId))

  return refreshed.accessToken
}

/**
 * List files in a Dropbox folder. Uses cursor-based pagination.
 *
 * On the first call, pass `path` (empty string for root).
 * On subsequent calls, pass `cursor` from the previous response.
 */
export async function listFiles(
  accessToken: string,
  path?: string,
  cursor?: string,
): Promise<{ entries: DropboxFileEntry[]; cursor: string; hasMore: boolean }> {
  let res: Response

  if (cursor) {
    // Continue from where we left off
    res = await fetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cursor }),
    })
  } else {
    // First page
    const folderPath = normaliseDropboxPath(path ?? "")
    res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: folderPath,
        recursive: false,
        include_deleted: false,
        include_media_info: false,
        limit: 50,
      }),
    })
  }

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Dropbox API error: ${res.status} ${errorText}`)
  }

  const data = await res.json()
  const parsed = dropboxListFolderResponseSchema.parse(data)

  return {
    entries: parsed.entries,
    cursor: parsed.cursor,
    hasMore: parsed.has_more,
  }
}

/**
 * Download a file's content from Dropbox.
 * Returns the file as a Buffer (for uploading to Supabase Storage).
 */
export async function downloadFile(accessToken: string, path: string): Promise<Buffer> {
  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to download file: ${res.status} ${errorText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Upload a file to Dropbox.
 * Uses the simple upload endpoint (max 150 MB).
 */
export async function uploadFile(
  accessToken: string,
  path: string,
  content: Buffer,
): Promise<DropboxFileEntry> {
  const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({
        path: normaliseDropboxPath(path),
        mode: "overwrite",
        autorename: false,
        mute: false,
      }),
      "Content-Type": "application/octet-stream",
    },
    body: content,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to upload file: ${res.status} ${errorText}`)
  }

  const data = await res.json()
  return dropboxFileEntrySchema.parse(data)
}

// ─── Connection Management ──────────────────────────────────────────────────

/**
 * Store Dropbox connection after OAuth flow completes.
 */
export async function connectDropbox(
  orgId: string,
  connectedBy: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number; accountId: string },
  folderPath: string = "",
): Promise<string> {
  const [integration] = await db
    .insert(integrations)
    .values({
      orgId,
      provider: "dropbox",
      name: "Dropbox",
      status: "connected",
      connectedBy,
      connectedAt: new Date(),
      externalAccountId: tokens.accountId,
      settings: {
        folderPath: normaliseDropboxPath(folderPath),
        accountType: "personal",
        _access_token: tokens.accessToken,
        _refresh_token: tokens.refreshToken,
        expires_at: Date.now() + tokens.expiresIn * 1000,
      },
    })
    .returning()

  return integration.id
}

/**
 * Disconnect a Dropbox integration (revoke tokens + update record).
 */
export async function disconnectDropbox(integrationId: string): Promise<void> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "dropbox") {
    throw new Error("Dropbox integration not found")
  }

  const settings = integration.settings as Record<string, unknown>
  const accessToken = settings._access_token as string

  // Revoke the token with Dropbox
  try {
    await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    // Best effort — token may already be expired/revoked
  }

  await db
    .update(integrations)
    .set({
      status: "disconnected",
      settings: {},
    })
    .where(eq(integrations.id, integrationId))
}
