/**
 * ============================================================================
 * FILE: lib/validations/user.schema.ts
 * ============================================================================
 *
 * WHAT THIS FILE IS:
 *   Zod validation schemas for user profile updates.
 *
 * DATA FLOW:
 *   Form submission → Zod validation → Server action → Drizzle → DB
 *
 * CONSUMERS:
 *   - lib/actions/user.actions.ts — validates mutation inputs server-side
 *   - components/forms/ — form-level validation (if needed)
 */

import { z } from "zod"

/**
 * updateUserProfileSchema — Validates input for updating user profile information.
 *
 * Updates users.fullName, users.phone, users.preferences JSONB.
 */
export const updateUserProfileSchema = z.object({
  fullName: z.string().max(255).trim().optional(),
  phone: z.string().max(20).trim().optional().nullable(),
  avatarUrl: z.string().url("Invalid URL").optional().nullable(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      notifications: z
        .object({
          email: z.boolean().optional(),
          inApp: z.boolean().optional(),
          taskReminders: z.boolean().optional(),
          documentAlerts: z.boolean().optional(),
        })
        .optional(),
      dashboard: z
        .object({
          defaultView: z.string().optional(),
          widgetLayout: z.record(z.unknown()).optional(),
        })
        .optional(),
    })
    .optional(),
})

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>
