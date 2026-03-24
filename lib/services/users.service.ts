"use server"

// ─────────────────────────────────────────────────────────────────────────────
// USERS SERVICE  (advisor team members — not client portal users)
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/app/db"
import { users, orgMembers } from "@/app/db/schema"
import { eq, isNull } from "drizzle-orm"
import type { User, UserRole } from "@/lib/types/mock"

/** The hardcoded "current" advisor for demo purposes. Replace with session/auth. */
const CURRENT_USER_ID = "user-001"

/** Map a DB users row to the User mock type shape. */
function toUser(row: typeof users.$inferSelect, role?: string): User {
  return {
    id: row.id,
    name: row.fullName ?? row.email,
    email: row.email,
    role: (role ?? "viewer") as UserRole,
    avatar: row.avatarUrl ?? undefined,
    lastLogin: row.updatedAt.toISOString(),
    mfaEnabled: false,
    status: row.deletedAt ? "inactive" : "active",
  }
}

export async function getCurrentUser(): Promise<User> {
  // REAL: const session = await getServerSession()
  //       return db.query.users.findFirst({ where: eq(users.id, session.user.id) })
  const rows = await db.select().from(users).where(eq(users.id, CURRENT_USER_ID))
  if (rows[0]) return toUser(rows[0])
  // Fallback — return first user if demo id doesn't exist
  const fallback = await db.select().from(users).limit(1)
  return toUser(fallback[0])
}

export async function getUsers(): Promise<User[]> {
  const rows = await db.select().from(users).where(isNull(users.deletedAt))
  return rows.map((r) => toUser(r))
}

export async function getUserById(id: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id))
  return rows[0] ? toUser(rows[0]) : undefined
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  // Role lives on orgMembers, not users — join to filter
  const rows = await db
    .select({ user: users, role: orgMembers.role })
    .from(users)
    .innerJoin(orgMembers, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.role, role as typeof orgMembers.role.enumValues[number]))
  return rows.map((r) => toUser(r.user, r.role))
}

export async function getActiveUsers(): Promise<User[]> {
  const rows = await db.select().from(users).where(isNull(users.deletedAt))
  return rows.map((r) => toUser(r))
}
