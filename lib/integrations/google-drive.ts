"use server"

/**
 * Google Drive Integration — Document Storage
 *
 * Google Drive handles:
 * - Importing documents from a client's Google Drive
 * - Exporting/backing up documents to Google Drive
 * - Browsing Drive folders to pick files
 *
 * FLOW:
 *   1. Advisor clicks "Connect Google Drive" → OAuth consent flow
 *   2. User authorizes file access → we store refresh token
 *   3. Advisor clicks "Import from Drive" → picks files → copies to Supabase Storage
 *   4. No webhook needed — import is on-demand
 *
 * REQUIRED ENV VARS:
 *   GOOGLE_CLIENT_ID       — already set (shared with Google OAuth sign-in)
 *   GOOGLE_CLIENT_SECRET   — already set
 *   (Uses the same Google Cloud project, just adds Drive scopes)
 */

import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq } from "drizzle-orm"

// ─── Configuration ──────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ""
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""

export function isGoogleDriveConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

// ─── OAuth ──────────────────────────────────────────────────────────────────

/**
 * Build the Google OAuth URL with Drive-specific scopes.
 * This is separate from the sign-in OAuth — it requests file access.
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Google Drive token exchange failed: ${error}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

/**
 * Refresh an expired access token.
 */
async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }).toString(),
  })

  if (!res.ok) throw new Error("Google Drive token refresh failed")

  const data = await res.json()
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

// ─── Drive API Helpers ──────────────────────────────────────────────────────

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: string
  modifiedTime: string
  webViewLink: string
  parents?: string[]
}

/**
 * Get an active access token for a Google Drive integration.
 */
export async function getAccessToken(integrationId: string): Promise<string> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
  })

  if (!integration || integration.provider !== "google_drive") {
    throw new Error("Google Drive integration not found")
  }

  const settings = integration.settings as Record<string, unknown>
  const expiresAt = settings.expires_at as number
  const refreshToken = settings._refresh_token as string

  // Return existing token if not expired
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
 * List files in a Google Drive folder.
 */
export async function listFiles(
  accessToken: string,
  folderId?: string,
  pageToken?: string,
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const query = folderId
    ? `'${folderId}' in parents and trashed = false`
    : "trashed = false"

  const params = new URLSearchParams({
    q: query,
    fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents)",
    pageSize: "50",
    orderBy: "modifiedTime desc",
  })

  if (pageToken) params.set("pageToken", pageToken)

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error(`Google Drive API error: ${res.statusText}`)

  const data = await res.json()
  return { files: data.files, nextPageToken: data.nextPageToken }
}

/**
 * Download a file's content from Google Drive.
 * Returns the file as an ArrayBuffer (for uploading to Supabase Storage).
 */
export async function downloadFile(accessToken: string, fileId: string): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) throw new Error(`Failed to download file: ${res.statusText}`)

  return res.arrayBuffer()
}

// ─── Connection Management ──────────────────────────────────────────────────

/**
 * Store Google Drive connection after OAuth flow completes.
 */
export async function connectGoogleDrive(
  orgId: string,
  connectedBy: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
): Promise<string> {
  const [integration] = await db
    .insert(integrations)
    .values({
      orgId,
      provider: "google_drive",
      name: "Google Drive",
      status: "connected",
      connectedBy,
      connectedAt: new Date(),
      settings: {
        _access_token: tokens.accessToken,
        _refresh_token: tokens.refreshToken,
        expires_at: Date.now() + tokens.expiresIn * 1000,
      },
    })
    .returning()

  return integration.id
}
