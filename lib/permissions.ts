import type { OrgMember } from "@/app/db/schema/org_members"

/**
 * RBAC Permission Matrix
 *
 * This module defines what each role can do on each resource.
 * It maps the spec's 5-role system (owner/admin/manager/viewer/external)
 * onto the 3 DB roles (admin/assistant/client):
 *
 * Spec Role    DB Role      Permissions
 * ──────────────────────────────────────
 * owner        admin        Full access except org deletion (last-admin guard)
 * admin        admin        Full write access
 * manager      assistant    Create/read/update (no delete, no invite)
 * viewer       client       Read-only (their own data)
 * external     client       Read-only (shared/public data only — enforced by RLS)
 */

export type DbRole = "admin" | "assistant" | "client"
export type Resource =
  | "org"
  | "client"
  | "entity"
  | "asset"
  | "valuation"
  | "document"
  | "task"
  | "report"
  | "compliance"
  | "ledger"
  | "team_member"
export type Action = "create" | "read" | "update" | "delete" | "invite" | "export"

/**
 * Permission matrix: role → resource → Set of allowed actions.
 *
 * Design:
 *   - admin can do everything (except org delete — enforced by guard)
 *   - assistant can create/read/update most resources (no delete, no invite)
 *   - client can only read their own data (RLS + UI guards enforce scope)
 */
const PERMISSIONS: Record<DbRole, Partial<Record<Resource, Set<Action>>>> = {
  admin: {
    org: new Set(["read", "update"]), // Deliberately NO "delete" — last-admin guard in action
    client: new Set(["create", "read", "update", "delete"]),
    entity: new Set(["create", "read", "update", "delete"]),
    asset: new Set(["create", "read", "update", "delete"]),
    valuation: new Set(["create", "read", "update"]),
    document: new Set(["create", "read", "update", "delete", "export"]),
    task: new Set(["create", "read", "update", "delete"]),
    report: new Set(["create", "read", "update", "delete", "export"]),
    compliance: new Set(["create", "read", "update", "delete"]),
    ledger: new Set(["read", "export"]),
    team_member: new Set(["create", "read", "update", "delete", "invite"]),
  },

  assistant: {
    org: new Set(["read"]),
    client: new Set(["create", "read", "update"]),
    entity: new Set(["create", "read", "update"]),
    asset: new Set(["create", "read", "update"]),
    valuation: new Set(["create", "read", "update"]),
    document: new Set(["create", "read", "update", "export"]),
    task: new Set(["create", "read", "update"]),
    report: new Set(["create", "read", "update", "export"]),
    compliance: new Set(["create", "read", "update"]),
    ledger: new Set(["read", "export"]),
    team_member: new Set(["read"]), // Can see members but not invite/change/remove
  },

  client: {
    org: new Set(["read"]),
    client: new Set(["read"]), // Only their own
    entity: new Set(["read"]), // Only related entities
    asset: new Set(["read"]), // Only their assets
    valuation: new Set(["read"]),
    document: new Set(["read"]),
    task: new Set(["read"]), // Only assigned tasks
    report: new Set(["read"]),
    compliance: new Set(["read"]),
    ledger: new Set(["read"]), // Only their own activity (no export)
    team_member: new Set(["read"]), // Can see org members
  },
}

/**
 * canDo(role, resource, action): boolean
 *
 * Check if a role is allowed to perform an action on a resource.
 * Pure function — no DB calls, no side effects.
 *
 * Example:
 *   canDo("assistant", "asset", "create") → true
 *   canDo("client", "asset", "delete") → false
 *   canDo("admin", "team_member", "invite") → true
 */
export function canDo(role: DbRole, resource: Resource, action: Action): boolean {
  const resourcePerms = PERMISSIONS[role]?.[resource]
  return resourcePerms?.has(action) ?? false
}

/**
 * requirePermission(role, resource, action): never
 *
 * Throws if the role is NOT allowed to perform the action.
 * Use this in Server Actions to guard mutations.
 *
 * Example:
 *   const session = await requireRole("assistant")
 *   requirePermission(session.role, "client", "delete") // throws if denied
 *   await db.delete(clients).where(eq(clients.id, clientId))
 *
 * @throws Error if permission is denied
 */
export function requirePermission(
  role: DbRole,
  resource: Resource,
  action: Action
): asserts role is DbRole {
  if (!canDo(role, resource, action)) {
    throw new Error(
      `Permission denied: ${role} cannot ${action} ${resource}`
    )
  }
}

/**
 * canInvite(callerRole, inviteRole): boolean
 *
 * Check if the caller can invite someone with the given role.
 *
 * Rules:
 *   - Only admin can invite
 *   - Admin cannot grant a role above their own (but since there's no role above admin, this is moot)
 *   - Assistant and client cannot invite at all
 *
 * Example:
 *   const session = await requireRole("admin")
 *   canInvite(session.role, "admin") → true (admin can invite admin)
 *   canInvite("assistant", "assistant") → false (assistant can't invite)
 */
export function canInvite(callerRole: DbRole, targetRole: DbRole): boolean {
  if (!canDo(callerRole, "team_member", "invite")) return false

  // Caller can only grant roles equal to or below their own
  const roleRank: Record<DbRole, number> = { client: 0, assistant: 1, admin: 2 }
  return roleRank[targetRole] <= roleRank[callerRole]
}

/**
 * canChangeRole(callerRole, targetCurrentRole, targetNewRole): boolean
 *
 * Check if the caller can change a member's role.
 *
 * Rules:
 *   - Only admin can change roles
 *   - Admin can only grant roles equal to or below their own
 *   - Cannot escalate a member to a role above the caller
 *
 * Example:
 *   canChangeRole("admin", "client", "assistant") → true
 *   canChangeRole("assistant", "client", "admin") → false (assistant can't grant roles)
 *   canChangeRole("admin", "assistant", "admin") → true (but last-admin guard prevents self-demotion)
 */
export function canChangeRole(
  callerRole: DbRole,
  targetCurrentRole: DbRole,
  targetNewRole: DbRole
): boolean {
  if (!canDo(callerRole, "team_member", "update")) return false

  // Caller can only grant roles equal to or below their own
  const roleRank: Record<DbRole, number> = { client: 0, assistant: 1, admin: 2 }
  return roleRank[targetNewRole] <= roleRank[callerRole]
}

/**
 * canRemove(callerRole): boolean
 *
 * Check if the caller can remove a team member.
 *
 * Only admin can remove members.
 */
export function canRemove(callerRole: DbRole): boolean {
  return canDo(callerRole, "team_member", "delete")
}
