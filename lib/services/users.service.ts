// ─────────────────────────────────────────────────────────────────────────────
// USERS SERVICE  (advisor team members — not client portal users)
// ─────────────────────────────────────────────────────────────────────────────

import { mockUsers } from "@/lib/mock/data"
import type { User, UserRole } from "@/lib/mock/types"

/** The hardcoded "current" advisor for demo purposes. Replace with session/auth. */
const CURRENT_USER_ID = "user-001"

export async function getCurrentUser(): Promise<User> {
  // REAL: const session = await getServerSession()
  //       return db.query.users.findFirst({ where: eq(users.id, session.user.id) })
  return mockUsers.find((u) => u.id === CURRENT_USER_ID)!
}

export async function getUsers(): Promise<User[]> {
  // REAL: return db.query.users.findMany({ where: eq(orgMembers.orgId, orgId) })
  return mockUsers
}

export async function getUserById(id: string): Promise<User | undefined> {
  // REAL: return db.query.users.findFirst({ where: eq(users.id, id) })
  return mockUsers.find((u) => u.id === id)
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  // REAL: return db.query.users.findMany({ where: eq(orgMembers.role, role) })
  return mockUsers.filter((u) => u.role === role)
}

export async function getActiveUsers(): Promise<User[]> {
  // REAL: return db.query.users.findMany({ where: eq(users.status, "active") })
  return mockUsers.filter((u) => u.status === "active")
}
