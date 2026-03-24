import { NextRequest, NextResponse } from "next/server"
import { eq, and, sql } from "drizzle-orm"
import { db } from "@/app/db"
import { apiKeys } from "@/app/db/schema"
import { hashApiKey, isValidApiKeyFormat } from "@/lib/api-key"
import { checkRateLimit } from "@/lib/rate-limiter"

/**
 * Authenticate and rate-limit an API request.
 *
 * Extracts the API key from the Authorization header,
 * verifies it against the database, and enforces rate limits.
 *
 * Returns the org context on success, or an error response.
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<
  | { orgId: string; keyId: string; keyName: string }
  | NextResponse
> {
  // ── Extract API key ──────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Authorization: Bearer lch_..." },
      { status: 401 }
    )
  }

  const rawKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim()

  if (!isValidApiKeyFormat(rawKey)) {
    return NextResponse.json(
      { error: "Invalid API key format. Keys start with 'lch_' followed by 64 hex characters." },
      { status: 401 }
    )
  }

  // ── Verify key hash ────────────────────────────────────────────────────
  const keyHash = hashApiKey(rawKey)

  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.revoked, false)),
  })

  if (!key) {
    return NextResponse.json(
      { error: "Invalid or revoked API key." },
      { status: 401 }
    )
  }

  // Check expiration
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: "API key has expired." },
      { status: 401 }
    )
  }

  // ── Check if org still exists ──────────────────────────────────────────
  const org = await db.query.orgs.findFirst({
    where: eq((await import("@/app/db/schema")).orgs.id, key.orgId),
  })

  if (!org) {
    return NextResponse.json(
      { error: "Organization associated with this API key no longer exists." },
      { status: 401 }
    )
  }

  // ── Rate limiting ──────────────────────────────────────────────────────
  const rateResult = await checkRateLimit(key.id)

  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 100 requests per minute." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateResult.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rateResult.resetAt / 1000)),
          "Retry-After": String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
        },
      }
    )
  }

  // ── Update last-used timestamp (fire and forget) ───────────────────────
  db.update(apiKeys)
    .set({
      lastUsedAt: new Date(),
      requestCount: sql`${apiKeys.requestCount} + 1`,
    })
    .where(eq(apiKeys.id, key.id))
    .then(() => {})
    .catch(() => {})

  return {
    orgId: key.orgId,
    keyId: key.id,
    keyName: key.name,
  }
}

/**
 * Parse and validate JSON body, enforcing 1MB limit.
 */
export async function parseJsonBody(request: NextRequest): Promise<
  | { data: Record<string, unknown> }
  | NextResponse
> {
  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength) > 1_048_576) {
    return NextResponse.json(
      { error: "Request body too large. Maximum 1MB." },
      { status: 413 }
    )
  }

  try {
    const body = await request.text()
    if (body.length > 1_048_576) {
      return NextResponse.json(
        { error: "Request body too large. Maximum 1MB." },
        { status: 413 }
      )
    }
    const data = JSON.parse(body)
    return { data }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    )
  }
}

/**
 * Standard JSON success response with rate limit headers.
 */
export function apiResponse(
  data: unknown,
  rateLimit?: { remaining: number; limit: number; resetAt: number },
  status = 200
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (rateLimit) {
    headers["X-RateLimit-Limit"] = String(rateLimit.limit)
    headers["X-RateLimit-Remaining"] = String(rateLimit.remaining)
    headers["X-RateLimit-Reset"] = String(Math.ceil(rateLimit.resetAt / 1000))
  }
  return NextResponse.json(data, { status, headers })
}
