/**
 * ============================================================================
 * FILE: lib/validations/org.schema.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Zod validation schemas for organization member management mutations.
 *
 * DATA FLOW:
 *   Form submission → Zod validation → GraphQL mutation → resolver → Drizzle → DB
 *
 * CONSUMERS:
 *   - lib/graphql/resolvers/org.ts — validates mutation inputs server-side
 *   - components/forms/ — form-level validation (if needed)
 */

import { z } from "zod"

/** DB enum values for org member roles. */
export const orgMemberRoleEnum = z.enum(["admin", "assistant", "client"])

/**
 * inviteOrgMemberSchema — Validates input for inviting a new member to the org.
 *
 * The invite flow: email + role → look up or create user → create org_member row.
 */
export const inviteOrgMemberSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  role: orgMemberRoleEnum,
  clientId: z.string().uuid("Invalid client ID").nullable().optional(),
})

export type InviteOrgMemberInput = z.infer<typeof inviteOrgMemberSchema>

/**
 * updateOrgMemberRoleSchema — Validates input for changing a member's role.
 */
export const updateOrgMemberRoleSchema = z.object({
  role: orgMemberRoleEnum,
  clientId: z.string().uuid("Invalid client ID").nullable().optional(),
})

export type UpdateOrgMemberRoleInput = z.infer<typeof updateOrgMemberRoleSchema>
