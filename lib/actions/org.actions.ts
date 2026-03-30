"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count, isNull } from "drizzle-orm"
import { db } from "@/app/db"
import { orgs, orgMembers, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { inviteOrgMemberSchema, updateOrgMemberRoleSchema, updateOrgSettingsSchema } from "@/lib/validations/org.schema"
import type { PaginatedResult } from "@/lib/types"

export interface OrgMemberUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

export interface OrgMemberRecord {
  id: string
  orgId: string
  userId: string
  role: "admin" | "assistant" | "client"
  clientId: string | null
  createdAt: Date
  updatedAt: Date
  user: OrgMemberUser
}

export async function getCurrentMember(): Promise<OrgMemberRecord | null> {
  const session = await requireAuth()
  const member = await db.query.orgMembers.findFirst({
    where: eq(orgMembers.id, session.memberId!),
  })
  if (!member) return null

  const user = await db.query.users.findFirst({ where: eq(users.id, member.userId) })
  return {
    ...member,
    role: member.role as "admin" | "assistant" | "client",
    user: {
      id: user?.id ?? member.userId,
      email: user?.email ?? "",
      fullName: user?.fullName ?? null,
      avatarUrl: user?.avatarUrl ?? null,
    },
  }
}

export async function getOrgMembers(params?: {
  page?: number
  limit?: number
}): Promise<PaginatedResult<OrgMemberRecord>> {
  const session = await requireAuth()
  const page = params?.page ?? 1
  const limit = Math.min(params?.limit ?? 100, 100)
  const offset = (page - 1) * limit

  // Filter: only active members (deletedAt is null)
  const where = and(
    eq(orgMembers.orgId, session.orgId!),
    isNull(orgMembers.deletedAt)
  )

  const [items, [{ total }]] = await Promise.all([
    db.select().from(orgMembers).where(where).orderBy(orgMembers.createdAt).limit(limit).offset(offset),
    db.select({ total: count() }).from(orgMembers).where(where),
  ])

  const enriched = await Promise.all(
    items.map(async (member) => {
      const user = await db.query.users.findFirst({ where: eq(users.id, member.userId) })
      return {
        ...member,
        role: member.role as "admin" | "assistant" | "client",
        user: {
          id: user?.id ?? member.userId,
          email: user?.email ?? "",
          fullName: user?.fullName ?? null,
          avatarUrl: user?.avatarUrl ?? null,
        },
      }
    })
  )

  return { items: enriched, totalCount: total, page, limit }
}

export async function inviteOrgMember(input: unknown): Promise<OrgMemberRecord> {
  const session = await requireRole("admin")
  const parsed = inviteOrgMemberSchema.parse(input)

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.email) })
  if (!user) throw new Error("No user found with that email")

  const existing = await db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.orgId, session.orgId!), eq(orgMembers.userId, user.id)),
  })
  if (existing) throw new Error("User is already a member of this organization")

  // GUARD: Can only grant roles equal to or below caller's own
  const roleRank: Record<"admin" | "assistant" | "client", number> = {
    client: 0,
    assistant: 1,
    admin: 2,
  }
  if (roleRank[parsed.role] > roleRank[session.role as "admin" | "assistant" | "client"]) {
    throw new Error("Cannot grant a role higher than your own")
  }

  const [created] = await db
    .insert(orgMembers)
    .values({
      orgId: session.orgId!,
      userId: user.id,
      role: parsed.role,
      clientId: parsed.clientId ?? null,
    })
    .returning()

  // Log the invite action
  const { createLedgerEvent } = await import("@/lib/actions/ledger")
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "permission_changed",
    targetType: "user",
    targetId: user.id,
    metadata: {
      action: "invited",
      role: parsed.role,
      email: parsed.email,
    },
  })

  return {
    ...created,
    role: created.role as "admin" | "assistant" | "client",
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? null,
      avatarUrl: user.avatarUrl ?? null,
    },
  }
}

export async function updateOrgMemberRole(id: string, input: unknown): Promise<OrgMemberRecord> {
  const session = await requireRole("admin")
  const parsed = updateOrgMemberRoleSchema.parse(input)

  const existing = await db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.id, id), eq(orgMembers.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Member not found")
  if (existing.id === session.memberId && parsed.role !== "admin") {
    throw new Error("Cannot change your own role")
  }

  // GUARD: Cannot remove the last admin (prevent org lockout)
  if (existing.role === "admin" && parsed.role !== "admin") {
    const adminCount = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, session.orgId!),
          eq(orgMembers.role, "admin"),
          // Don't count soft-deleted members
          eq(orgMembers.deletedAt, null as any)
        )
      )
    if (adminCount.length <= 1) {
      throw new Error("Cannot remove the last admin from the organization")
    }
  }

  // GUARD: Can only grant roles equal to or below caller's own
  const roleRank: Record<"admin" | "assistant" | "client", number> = {
    client: 0,
    assistant: 1,
    admin: 2,
  }
  if (roleRank[parsed.role] > roleRank[session.role as "admin" | "assistant" | "client"]) {
    throw new Error("Cannot grant a role higher than your own")
  }

  const [updated] = await db
    .update(orgMembers)
    .set({ role: parsed.role, clientId: parsed.clientId ?? existing.clientId })
    .where(eq(orgMembers.id, id))
    .returning()

  // Log the role change
  const { createLedgerEvent } = await import("@/lib/actions/ledger")
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "permission_changed",
    targetType: "user",
    targetId: updated.userId,
    metadata: {
      action: "role_changed",
      oldRole: existing.role,
      newRole: parsed.role,
    },
  })

  const user = await db.query.users.findFirst({ where: eq(users.id, updated.userId) })
  return {
    ...updated,
    role: updated.role as "admin" | "assistant" | "client",
    user: {
      id: user?.id ?? updated.userId,
      email: user?.email ?? "",
      fullName: user?.fullName ?? null,
      avatarUrl: user?.avatarUrl ?? null,
    },
  }
}

export async function removeOrgMember(id: string): Promise<boolean> {
  const session = await requireRole("admin")
  const existing = await db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.id, id), eq(orgMembers.orgId, session.orgId!)),
  })
  if (!existing) throw new Error("Member not found")
  if (existing.id === session.memberId) throw new Error("Cannot remove yourself from the organization")

  // GUARD: Cannot remove the last admin (prevent org lockout)
  if (existing.role === "admin") {
    const adminCount = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, session.orgId!),
          eq(orgMembers.role, "admin"),
          // Don't count soft-deleted members
          eq(orgMembers.deletedAt, null as any)
        )
      )
    if (adminCount.length <= 1) {
      throw new Error("Cannot remove the last admin from the organization")
    }
  }

  // SOFT DELETE: Set deletedAt instead of hard delete
  // This preserves ledger integrity (ledger events still reference this member via ID)
  await db
    .update(orgMembers)
    .set({ deletedAt: new Date() })
    .where(eq(orgMembers.id, id))

  // Log the removal
  const { createLedgerEvent } = await import("@/lib/actions/ledger")
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "permission_changed",
    targetType: "user",
    targetId: existing.userId,
    metadata: {
      action: "removed",
      role: existing.role,
    },
  })

  return true
}

export async function updateOrgSettings(input: unknown): Promise<void> {
  const session = await requireRole("admin")
  const parsed = updateOrgSettingsSchema.parse(input)

  // Get existing org to merge settings
  const existing = await db.query.orgs.findFirst({
    where: eq(orgs.id, session.orgId!),
  })
  if (!existing) throw new Error("Organization not found")

  // Build update object
  const setData: Record<string, unknown> = {}
  if (parsed.name !== undefined) setData.name = parsed.name
  if (parsed.timezone !== undefined || parsed.currency !== undefined || parsed.logoUrl !== undefined) {
    const currentSettings = (existing.settings as object ?? {}) as Record<string, unknown>
    if (parsed.timezone !== undefined) currentSettings.timezone = parsed.timezone
    if (parsed.currency !== undefined) currentSettings.currency = parsed.currency
    if (parsed.logoUrl !== undefined) {
      if (!currentSettings.branding) currentSettings.branding = {}
      const branding = currentSettings.branding as Record<string, unknown>
      branding.logoUrl = parsed.logoUrl
    }
    setData.settings = currentSettings
  }

  await db
    .update(orgs)
    .set(setData)
    .where(eq(orgs.id, session.orgId!))

  // Log the org settings update
  const { createLedgerEvent } = await import("@/lib/actions/ledger")
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: session.orgId!,
    metadata: {
      fields: Object.keys(setData),
    },
  })

  captureServerEvent(session.userId, "org.settings_updated", { fields: Object.keys(setData) })
}
