"use server"

import { eq } from "drizzle-orm"
import { db } from "@/app/db"
import { orgs } from "@/app/db/schema"
import { getSessionOrRedirect } from "@/lib/auth"
import { requirePermission, type DbRole } from "@/lib/permissions"
import { createLedgerEvent } from "@/lib/actions/ledger"
import type { OrgSettings } from "@/app/db/schema/orgs"

type ActionResult = { error: string } | { success: true }

// ─── Get org branding ────────────────────────────────────────────────────────

export async function getOrgBranding() {
  const session = await getSessionOrRedirect()

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, session.orgId),
  })
  if (!org) return { error: "Organization not found" }

  return {
    orgName: org.name,
    branding: (org.settings as OrgSettings)?.branding ?? {},
  }
}

// ─── Update org branding ────────────────────────────────────────────────────

export async function updateOrgBranding(branding: {
  logoUrl?: string | null
  primaryColor?: string
  accentColor?: string
  customDomain?: string
  orgDisplayName?: string
}): Promise<ActionResult> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "org", "update")

  const org = await db.query.orgs.findFirst({
    where: eq(orgs.id, session.orgId),
  })
  if (!org) return { error: "Organization not found" }

  // Validate hex colors
  if (branding.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(branding.primaryColor)) {
    return { error: "Invalid primary color format. Use hex like #0D9488" }
  }
  if (branding.accentColor && !/^#[0-9a-fA-F]{6}$/.test(branding.accentColor)) {
    return { error: "Invalid accent color format. Use hex like #06b6d4" }
  }

  const currentSettings = (org.settings as OrgSettings) ?? {}
  const updatedSettings: OrgSettings = {
    ...currentSettings,
    branding: {
      ...currentSettings.branding,
      ...(branding.logoUrl !== undefined && { logoUrl: branding.logoUrl ?? undefined }),
      ...(branding.primaryColor !== undefined && { primaryColor: branding.primaryColor }),
      ...(branding.accentColor !== undefined && { accentColor: branding.accentColor }),
      ...(branding.customDomain !== undefined && { customDomain: branding.customDomain }),
      ...(branding.orgDisplayName !== undefined && { orgDisplayName: branding.orgDisplayName }),
    },
  }

  await db
    .update(orgs)
    .set({ settings: updatedSettings })
    .where(eq(orgs.id, session.orgId))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: session.orgId,
    metadata: { type: "branding", fields: Object.keys(branding) },
  })

  return { success: true }
}
