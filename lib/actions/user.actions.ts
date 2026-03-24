"use server"

import { eq } from "drizzle-orm"
import { db } from "@/app/db"
import { users } from "@/app/db/schema"
import { requireAuth } from "@/lib/auth"
import { updateUserProfileSchema, type UpdateUserProfileInput } from "@/lib/validations/user.schema"
import type { UserRecord } from "@/lib/types"

/**
 * updateUserProfile — Updates user profile information.
 *
 * Updates fullName, phone, avatarUrl, and preferences in the users table.
 * Logs a ledger event for the update.
 */
export async function updateUserProfile(input: UpdateUserProfileInput): Promise<UserRecord> {
  const session = await requireAuth()
  const parsed = updateUserProfileSchema.parse(input)

  // Get existing user to merge preferences
  const existing = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  })
  if (!existing) throw new Error("User not found")

  // Build update object
  const setData: Record<string, unknown> = {}
  if (parsed.fullName !== undefined) setData.fullName = parsed.fullName || null
  if (parsed.phone !== undefined) setData.phone = parsed.phone
  if (parsed.avatarUrl !== undefined) setData.avatarUrl = parsed.avatarUrl
  if (parsed.preferences !== undefined) {
    setData.preferences = {
      ...(existing.preferences as object ?? {}),
      ...parsed.preferences,
    }
  }

  const [updated] = await db
    .update(users)
    .set(setData)
    .where(eq(users.id, session.userId))
    .returning()

  // Log the profile update
  const { createLedgerEvent } = await import("@/lib/actions/ledger")
  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "updated",
    targetType: "user",
    targetId: session.userId,
    metadata: {
      fields: Object.keys(setData),
    },
  })

  return updated as unknown as UserRecord
}
