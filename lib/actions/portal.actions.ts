"use server"

import { eq, and } from "drizzle-orm"
import { db } from "@/app/db"
import { stakeholderPortals, ledgerEvents, clients, orgs } from "@/app/db/schema"
import { getSessionOrRedirect } from "@/lib/auth"
import { requirePermission, type DbRole } from "@/lib/permissions"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { generatePortalToken } from "@/lib/portal-token"
import type { PortalVisibility } from "@/app/db/schema/stakeholder_portals"

type ActionResult = { error: string } | { success: true }

// ─── List portals ────────────────────────────────────────────────────────────

export async function getPortals() {
  const session = await getSessionOrRedirect()
  return db.query.stakeholderPortals.findMany({
    where: eq(stakeholderPortals.orgId, session.orgId),
    with: { client: true },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  })
}

// ─── Create portal ──────────────────────────────────────────────────────────

export async function createPortal(params: {
  clientId: string
  name: string
  visibility?: PortalVisibility
}): Promise<{ error: string } | { success: true; id: string; token: string }> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "client", "update")

  const { clientId, name, visibility } = params

  if (!name.trim()) return { error: "Portal name is required" }

  // Verify client belongs to this org
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.orgId, session.orgId)),
  })
  if (!client) return { error: "Client not found" }

  const token = generatePortalToken()

  const [portal] = await db
    .insert(stakeholderPortals)
    .values({
      orgId: session.orgId,
      clientId,
      name: name.trim(),
      token,
      visibility: visibility ?? {
        assets: true,
        documents: false,
        reports: false,
        entities: true,
        valuations: true,
      },
      createdBy: session.userId,
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "created",
    targetType: "client",
    targetId: portal.id,
    metadata: { type: "stakeholder_portal", clientName: client.displayName, portalName: name },
  })

  return { success: true, id: portal.id, token }
}

// ─── Update portal visibility ───────────────────────────────────────────────

export async function updatePortal(
  id: string,
  updates: {
    name?: string
    visibility?: PortalVisibility
    enabled?: boolean
  }
): Promise<ActionResult> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "client", "update")

  const existing = await db.query.stakeholderPortals.findFirst({
    where: and(eq(stakeholderPortals.id, id), eq(stakeholderPortals.orgId, session.orgId)),
  })
  if (!existing) return { error: "Portal not found" }

  await db
    .update(stakeholderPortals)
    .set({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.visibility !== undefined && { visibility: updates.visibility }),
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
    })
    .where(eq(stakeholderPortals.id, id))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "client",
    targetId: id,
    metadata: { type: "stakeholder_portal", updates: Object.keys(updates) },
  })

  return { success: true }
}

// ─── Delete portal ──────────────────────────────────────────────────────────

export async function deletePortal(id: string): Promise<ActionResult> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "client", "delete")

  const existing = await db.query.stakeholderPortals.findFirst({
    where: and(eq(stakeholderPortals.id, id), eq(stakeholderPortals.orgId, session.orgId)),
  })
  if (!existing) return { error: "Portal not found" }

  await db.delete(stakeholderPortals).where(eq(stakeholderPortals.id, id))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "deleted",
    targetType: "client",
    targetId: id,
    metadata: { type: "stakeholder_portal", name: existing.name },
  })

  return { success: true }
}

// ─── Get portal by token (public, no auth required) ─────────────────────────

export async function getPortalByToken(token: string) {
  const portal = await db.query.stakeholderPortals.findFirst({
    where: and(
      eq(stakeholderPortals.token, token),
      eq(stakeholderPortals.enabled, true)
    ),
    with: { client: true, org: true },
  })

  if (!portal) return null

  // Check expiration
  if (portal.expiresAt && new Date(portal.expiresAt) < new Date()) return null

  return portal
}

// ─── Log external access ────────────────────────────────────────────────────

export async function logPortalAccess(params: {
  portalId: string
  orgId: string
  email: string
  ipAddress?: string
}) {
  await db.insert(ledgerEvents).values({
    orgId: params.orgId,
    actorUserId: null,
    action: "login",
    targetType: "client",
    targetId: params.portalId,
    payload: { actor: `external:${params.email}`, type: "portal_access" },
    ipAddress: params.ipAddress ?? null,
  })
}

// ─── Send magic link ────────────────────────────────────────────────────────

export async function sendPortalMagicLink(params: {
  email: string
  portalToken: string
}): Promise<ActionResult> {
  const { createClient } = await import("@/utils/supabase/server")
  const supabase = await createClient()

  const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/${params.portalToken}`

  const { error } = await supabase.auth.signInWithOtp({
    email: params.email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  })

  if (error) return { error: error.message }
  return { success: true }
}
