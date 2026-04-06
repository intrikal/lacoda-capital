/**
 * ============================================================================
 * FILE: lib/validations/org.schema.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Zod validation schemas for organization member management mutations.
 *
 * DATA FLOW:
 *   Form submission → Zod validation → server action → Drizzle → DB
 *
 * CONSUMERS:
 *   - lib/actions/org.actions.ts — validates inputs server-side
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

/**
 * updateOrgSettingsSchema — Validates input for updating org settings.
 *
 * Updates org.name, org.settings.timezone, org.settings.currency, org.settings.branding.logoUrl
 */
export const updateOrgSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255).trim().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  logoUrl: z.string().url("Invalid URL").optional().nullable(),
})

export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsSchema>
