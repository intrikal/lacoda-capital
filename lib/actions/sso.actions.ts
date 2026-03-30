"use server"

import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and } from "drizzle-orm"
import { db } from "@/app/db"
import { samlProviders } from "@/app/db/schema"
import { getSessionOrRedirect } from "@/lib/auth"
import { requirePermission, type DbRole } from "@/lib/permissions"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { IDP_PRESETS } from "@/lib/sso"
import type { SamlAttributeMapping } from "@/app/db/schema/saml_providers"

type ActionResult = { error: string } | { success: true; id?: string }

// ─── List SSO providers ──────────────────────────────────────────────────────

export async function getSsoProviders() {
  const session = await getSessionOrRedirect()
  return db.query.samlProviders.findMany({
    where: eq(samlProviders.orgId, session.orgId),
    orderBy: (sp, { desc }) => [desc(sp.createdAt)],
  })
}

// ─── Add SSO provider ────────────────────────────────────────────────────────

export async function addSsoProvider(params: {
  name: string
  providerType: string
  domains: string[]
  metadataUrl?: string
  metadataXml?: string
  attributeMapping?: SamlAttributeMapping
  groupRoleMapping?: Record<string, string>
  defaultRole?: string
  enforced?: boolean
}): Promise<ActionResult> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "org", "update")

  const { name, providerType, domains, metadataUrl, metadataXml } = params

  if (!name.trim()) return { error: "Provider name is required" }
  if (domains.length === 0) return { error: "At least one domain is required" }
  if (!metadataUrl && !metadataXml) {
    return { error: "Either metadata URL or XML upload is required" }
  }

  // Apply preset attribute mapping if using a known provider type
  const preset = IDP_PRESETS[providerType]
  const attributeMapping = params.attributeMapping ?? preset?.attributeMapping ?? IDP_PRESETS.custom.attributeMapping

  // Parse metadata to extract entityId, ssoUrl, certificate
  let entityId: string | undefined
  let ssoUrl: string | undefined
  let certificate: string | undefined
  let resolvedXml = metadataXml

  if (metadataUrl) {
    try {
      const res = await fetch(metadataUrl, { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) return { error: `Could not fetch metadata URL: HTTP ${res.status}. You can upload the XML manually instead.` }
      resolvedXml = await res.text()
    } catch {
      return { error: "Metadata URL is unreachable. Please check the URL or upload the XML manually." }
    }
  }

  if (resolvedXml) {
    const parsed = parseMetadataXml(resolvedXml)
    entityId = parsed.entityId
    ssoUrl = parsed.ssoUrl
    certificate = parsed.certificate
  }

  const [provider] = await db
    .insert(samlProviders)
    .values({
      orgId: session.orgId,
      name: name.trim(),
      providerType,
      domains,
      metadataUrl: metadataUrl ?? null,
      metadataXml: resolvedXml ?? null,
      entityId: entityId ?? null,
      ssoUrl: ssoUrl ?? null,
      certificate: certificate ?? null,
      attributeMapping,
      groupRoleMapping: params.groupRoleMapping ?? {},
      defaultRole: params.defaultRole ?? "client",
      enforced: params.enforced ?? false,
    })
    .returning()

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "created",
    targetType: "org",
    targetId: provider.id,
    metadata: { type: "sso_provider", name, providerType, domains },
  })

  captureServerEvent(session.userId, "sso.provider_configured", { provider_type: providerType })

  return { success: true, id: provider.id }
}

// ─── Update SSO provider ────────────────────────────────────────────────────

export async function updateSsoProvider(
  id: string,
  updates: {
    name?: string
    domains?: string[]
    attributeMapping?: SamlAttributeMapping
    groupRoleMapping?: Record<string, string>
    defaultRole?: string
    enforced?: boolean
    enabled?: boolean
  }
): Promise<ActionResult> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "org", "update")

  const existing = await db.query.samlProviders.findFirst({
    where: and(eq(samlProviders.id, id), eq(samlProviders.orgId, session.orgId)),
  })

  if (!existing) return { error: "SSO provider not found" }

  await db
    .update(samlProviders)
    .set({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.domains !== undefined && { domains: updates.domains }),
      ...(updates.attributeMapping !== undefined && { attributeMapping: updates.attributeMapping }),
      ...(updates.groupRoleMapping !== undefined && { groupRoleMapping: updates.groupRoleMapping }),
      ...(updates.defaultRole !== undefined && { defaultRole: updates.defaultRole }),
      ...(updates.enforced !== undefined && { enforced: updates.enforced }),
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
    })
    .where(eq(samlProviders.id, id))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: id,
    metadata: { type: "sso_provider", updates: Object.keys(updates) },
  })

  return { success: true }
}

// ─── Delete SSO provider ────────────────────────────────────────────────────

export async function deleteSsoProvider(id: string): Promise<ActionResult> {
  const session = await getSessionOrRedirect()
  requirePermission(session.role as DbRole, "org", "update")

  const existing = await db.query.samlProviders.findFirst({
    where: and(eq(samlProviders.id, id), eq(samlProviders.orgId, session.orgId)),
  })

  if (!existing) return { error: "SSO provider not found" }

  await db.delete(samlProviders).where(eq(samlProviders.id, id))

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "deleted",
    targetType: "org",
    targetId: id,
    metadata: { type: "sso_provider", name: existing.name },
  })

  return { success: true }
}

// ─── Check if domain has SSO enforced ────────────────────────────────────────

export async function checkDomainSso(
  email: string
): Promise<{ hasSso: boolean; enforced: boolean; providerId?: string; orgId?: string }> {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return { hasSso: false, enforced: false }

  // Find any enabled SAML provider that claims this domain
  const providers = await db.query.samlProviders.findMany({
    where: eq(samlProviders.enabled, true),
  })

  for (const provider of providers) {
    const domains = (provider.domains as string[]) ?? []
    if (domains.some((d) => d.toLowerCase() === domain)) {
      return {
        hasSso: true,
        enforced: provider.enforced,
        providerId: provider.id,
        orgId: provider.orgId,
      }
    }
  }

  return { hasSso: false, enforced: false }
}

// ─── Simple XML parsing helpers ──────────────────────────────────────────────
// These extract key values from SAML metadata XML without a full XML parser.

function parseMetadataXml(xml: string): {
  entityId?: string
  ssoUrl?: string
  certificate?: string
} {
  const entityIdMatch = xml.match(/entityID="([^"]+)"/)
  const ssoUrlMatch = xml.match(/Location="(https?:\/\/[^"]+)"/)
  const certMatch = xml.match(/<ds:X509Certificate>([\s\S]*?)<\/ds:X509Certificate>/)
    ?? xml.match(/<X509Certificate>([\s\S]*?)<\/X509Certificate>/)

  return {
    entityId: entityIdMatch?.[1],
    ssoUrl: ssoUrlMatch?.[1],
    certificate: certMatch?.[1]?.replace(/\s/g, ""),
  }
}
