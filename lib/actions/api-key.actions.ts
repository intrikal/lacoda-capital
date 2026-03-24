"use server"

import { eq, and } from "drizzle-orm"
import { db } from "@/app/db"
import { apiKeys } from "@/app/db/schema"
import { getSessionOrRedirect } from "@/lib/auth"
import { requirePermission, type DbRole } from "@/lib/permissions"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { generateApiKey, sanitizeKeyName } from "@/lib/api-key"

type ActionResult = { error: string } | { success: true }

// ─── List API keys ──────────────────────────────────────────────────────────

export async function getApiKeys() {
  const session = await getSessionOrRedirect()
  return db.query.apiKeys.findMany({
    where: eq(apiKeys.orgId, session.orgId),
    orderBy: (k, { desc }) => [desc(k.createdAt)],
  })
}

// ─── Create API key ──────────────────────────────────────────────────────────

export async function createApiKey(
  name: string
): Promise<{ error: string } | { success: true; rawKey: string; id: string }> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "org", "update")

  const sanitized = sanitizeKeyName(name)
  if (!sanitized) return { error: "Key name is required" }

  // Check for duplicate names within the org
  const existing = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.orgId, session.orgId), eq(apiKeys.name, sanitized)),
  })
  if (existing) return { error: "An API key with this name already exists" }

  const { rawKey, keyHash, keyPrefix } = generateApiKey()

  const [key] = await db
    .insert(apiKeys)
    .values({
      orgId: session.orgId,
      name: sanitized,
      keyHash,
      keyPrefix,
      createdBy: session.userId,
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "created",
    targetType: "org",
    targetId: key.id,
    metadata: { type: "api_key", name: sanitized, keyPrefix },
  })

  return { success: true, rawKey, id: key.id }
}

// ─── Revoke API key ──────────────────────────────────────────────────────────

export async function revokeApiKey(id: string): Promise<ActionResult> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "org", "update")

  const existing = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.orgId, session.orgId)),
  })

  if (!existing) return { error: "API key not found" }
  if (existing.revoked) return { error: "API key is already revoked" }

  await db
    .update(apiKeys)
    .set({ revoked: true, revokedAt: new Date() })
    .where(eq(apiKeys.id, id))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "deleted",
    targetType: "org",
    targetId: id,
    metadata: { type: "api_key", name: existing.name, keyPrefix: existing.keyPrefix },
  })

  return { success: true }
}

// ─── Delete API key permanently ──────────────────────────────────────────────

export async function deleteApiKey(id: string): Promise<ActionResult> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "org", "update")

  const existing = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.orgId, session.orgId)),
  })

  if (!existing) return { error: "API key not found" }

  await db.delete(apiKeys).where(eq(apiKeys.id, id))

  return { success: true }
}
