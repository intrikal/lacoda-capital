"use server"

import { db } from "@/app/db"
import { ledgerEvents } from "@/app/db/schema"

/**
 * createLedgerEvent — Writes an immutable audit log entry.
 *
 * Called by every Server Action after a successful mutation.
 * Strips sensitive fields (password, token, secret) from metadata.
 */
export async function createLedgerEvent(params: {
  orgId: string
  actorId: string | null
  action: typeof ledgerEvents.$inferInsert["action"]
  targetType: typeof ledgerEvents.$inferInsert["targetType"]
  targetId: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}) {
  const { orgId, actorId, action, targetType, targetId, metadata, ipAddress } = params

  if (actorId === null && !metadata?.actorType) {
    throw new Error("actorId or metadata.actorType is required for audit logging")
  }

  // Strip sensitive fields from metadata
  const sanitized = metadata ? sanitizeMetadata(metadata) : {}

  await db.insert(ledgerEvents).values({
    orgId,
    actorUserId: actorId,
    action,
    targetType,
    targetId,
    payload: sanitized,
    ipAddress: ipAddress ?? null,
  })
}

const SENSITIVE_KEYS = new Set(["password", "token", "secret", "apiKey", "api_key", "authorization"])

function sanitizeMetadata(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue
    result[key] = value
  }
  return result
}
