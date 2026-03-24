"use server"

import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { orgs, orgMembers, users } from "@/app/db/schema"
import { requireAuth, requireRole } from "@/lib/auth"
import { inviteOrgMemberSchema, updateOrgMemberRoleSchema } from "@/lib/validations/org.schema"
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

  const where = eq(orgMembers.orgId, session.orgId!)
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

  const [created] = await db
    .insert(orgMembers)
    .values({
      orgId: session.orgId!,
      userId: user.id,
      role: parsed.role,
      clientId: parsed.clientId ?? null,
    })
    .returning()

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

  const [updated] = await db
    .update(orgMembers)
    .set({ role: parsed.role, clientId: parsed.clientId ?? existing.clientId })
    .where(eq(orgMembers.id, id))
    .returning()

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
  await db.delete(orgMembers).where(eq(orgMembers.id, id))
  return true
}
