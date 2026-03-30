"use server"

import * as Sentry from "@sentry/nextjs"
import { captureServerEvent } from "@/lib/analytics/server"
import { eq, and, count } from "drizzle-orm"
import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { requireRole } from "@/lib/auth"
import { createIntegrationSchema, updateIntegrationSchema } from "@/lib/validations/integration.schema"
import type { PaginatedResult } from "@/lib/types"

// Re-export provider availability checks
import { isPlaidConfigured } from "@/lib/integrations/plaid"
import { isStripeConfigured } from "@/lib/integrations/stripe"
import { isDocuSignConfigured } from "@/lib/integrations/docusign"
import { isGoogleDriveConfigured } from "@/lib/integrations/google-drive"
import { isQuickBooksConfigured } from "@/lib/integrations/quickbooks"
import { isSalesforceConfigured } from "@/lib/integrations/salesforce"
import { isDropboxConfigured } from "@/lib/integrations/dropbox"
import { isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IntegrationRecord {
  id: string
  orgId: string
  provider: string
  name: string
  status: string
  statusMessage: string | null
  externalAccountId: string | null
  externalItemId: string | null
  connectedBy: string | null
  connectedAt: Date | null
  lastSyncAt: Date | null
  settings: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

// ─── Provider Availability ──────────────────────────────────────────────────

/**
 * Check which integrations are configured (env vars set).
 * Used by the UI to show which providers are available to connect.
 */
export async function getAvailableProviders(): Promise<
  Record<string, { configured: boolean; connected: boolean }>
> {
  const session = await requireRole("assistant")

  // Get all connected integrations for this org
  const connected = await db
    .select({ provider: integrations.provider })
    .from(integrations)
    .where(and(eq(integrations.orgId, session.orgId), eq(integrations.status, "connected")))

  const connectedProviders = new Set(connected.map((c) => c.provider))

  return {
    stripe: { configured: isStripeConfigured(), connected: connectedProviders.has("stripe") },
    plaid: { configured: isPlaidConfigured(), connected: connectedProviders.has("plaid") },
    docusign: { configured: isDocuSignConfigured(), connected: connectedProviders.has("docusign") },
    google_drive: { configured: isGoogleDriveConfigured(), connected: connectedProviders.has("google_drive") },
    quickbooks: { configured: isQuickBooksConfigured(), connected: connectedProviders.has("quickbooks") },
    google_calendar: { configured: isGoogleCalendarConfigured(), connected: connectedProviders.has("google_calendar") },
    dropbox: { configured: isDropboxConfigured(), connected: connectedProviders.has("dropbox") },
    salesforce: { configured: isSalesforceConfigured(), connected: connectedProviders.has("salesforce") },
  }
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export async function getIntegrations(): Promise<IntegrationRecord[]> {
  const session = await requireRole("assistant")

  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.orgId, session.orgId))
    .orderBy(integrations.createdAt)

  // Strip sensitive data from settings before sending to client
  return rows.map((row) => ({
    ...row,
    settings: stripSecrets(row.settings as Record<string, unknown> | null),
  })) as unknown as IntegrationRecord[]
}

export async function getIntegration(id: string): Promise<IntegrationRecord | null> {
  const session = await requireRole("assistant")

  const row = await db.query.integrations.findFirst({
    where: and(eq(integrations.id, id), eq(integrations.orgId, session.orgId)),
  })

  if (!row) return null

  return {
    ...row,
    settings: stripSecrets(row.settings as Record<string, unknown> | null),
  } as unknown as IntegrationRecord
}

export async function disconnectIntegration(id: string): Promise<void> {
  const session = await requireRole("admin")

  // Provider-specific cleanup
  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.id, id), eq(integrations.orgId, session.orgId)),
  })

  if (!integration) throw new Error("Integration not found")

  try {
    if (integration.provider === "plaid") {
      const { disconnectPlaidItem } = await import("@/lib/integrations/plaid")
      await disconnectPlaidItem(id)
      Sentry.addBreadcrumb({
        category: "integration",
        message: `Integration disconnected: ${integration.provider}`,
        data: { integrationId: id, provider: integration.provider },
        level: "info",
      })
      captureServerEvent(session.userId, "integration.disconnected", { provider: integration.provider })
      return
    }

    // Generic disconnect
    await db
      .update(integrations)
      .set({
        status: "disconnected",
        settings: {},
      })
      .where(and(eq(integrations.id, id), eq(integrations.orgId, session.orgId)))

    Sentry.addBreadcrumb({
      category: "integration",
      message: `Integration disconnected: ${integration.provider}`,
      data: { integrationId: id, provider: integration.provider },
      level: "info",
    })
    captureServerEvent(session.userId, "integration.disconnected", { provider: integration.provider })
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)))
    throw err
  }
}

export async function deleteIntegration(id: string): Promise<void> {
  const session = await requireRole("admin")

  await db
    .delete(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.orgId, session.orgId)))
}

// ─── Plaid-specific Actions ─────────────────────────────────────────────────

export async function createPlaidLinkToken(): Promise<string> {
  const session = await requireRole("assistant")
  const { createLinkToken } = await import("@/lib/integrations/plaid")
  return createLinkToken(session.userId, session.orgId)
}

export async function exchangePlaidPublicToken(
  publicToken: string,
): Promise<{ integrationId: string; itemId: string }> {
  const session = await requireRole("assistant")
  const { exchangePublicToken } = await import("@/lib/integrations/plaid")
  try {
    const result = await exchangePublicToken(publicToken, session.orgId, session.userId)
    Sentry.addBreadcrumb({
      category: "integration",
      message: "Plaid integration connected",
      data: { integrationId: result.integrationId },
      level: "info",
    })
    captureServerEvent(session.userId, "integration.connected", { provider: "plaid" })
    captureServerEvent(session.userId, "plaid.link_completed", { integration_id: result.integrationId })
    return result
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)))
    throw err
  }
}

export async function refreshPlaidBalances(
  integrationId: string,
): Promise<{ accounts: { name: string; balance: number | null }[] }> {
  const session = await requireRole("assistant")

  // Verify ownership
  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.id, integrationId), eq(integrations.orgId, session.orgId)),
  })
  if (!integration) throw new Error("Integration not found")

  try {
    const { getAccountBalances } = await import("@/lib/integrations/plaid")
    const accounts = await getAccountBalances(integrationId)
    return {
      accounts: accounts.map((a) => ({
        name: a.name,
        balance: a.balances.current,
      })),
    }
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)))
    throw err
  }
}

// ─── Stripe-specific Actions ────────────────────────────────────────────────

export async function connectStripeIntegration(): Promise<string> {
  const session = await requireRole("admin")
  const { connectStripe } = await import("@/lib/integrations/stripe")
  try {
    const result = await connectStripe(session.orgId, session.userId)
    Sentry.addBreadcrumb({
      category: "integration",
      message: "Stripe integration connected",
      level: "info",
    })
    captureServerEvent(session.userId, "integration.connected", { provider: "stripe" })
    return result
  } catch (err) {
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)))
    throw err
  }
}

// ─── OAuth-based Integration Actions ────────────────────────────────────────

export async function getDocuSignAuthUrl(): Promise<string> {
  const session = await requireRole("assistant")
  const { getAuthorizationUrl } = await import("@/lib/integrations/docusign")
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/docusign/callback`
  return getAuthorizationUrl(redirectUri, session.orgId)
}

export async function getGoogleDriveAuthUrl(): Promise<string> {
  const session = await requireRole("assistant")
  const { getAuthorizationUrl } = await import("@/lib/integrations/google-drive")
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/google-drive/callback`
  return getAuthorizationUrl(redirectUri, session.orgId)
}

export async function getQuickBooksAuthUrl(): Promise<string> {
  const session = await requireRole("assistant")
  const { getAuthorizationUrl } = await import("@/lib/integrations/quickbooks")
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/quickbooks/callback`
  return getAuthorizationUrl(redirectUri, session.orgId)
}

export async function getSalesforceAuthUrl(): Promise<string> {
  const session = await requireRole("assistant")
  const { getAuthorizationUrl } = await import("@/lib/integrations/salesforce")
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/salesforce/callback`
  return getAuthorizationUrl(redirectUri, session.orgId)
}

export async function getGoogleCalendarAuthUrl(): Promise<string> {
  const session = await requireRole("assistant")
  const { getAuthorizationUrl } = await import("@/lib/integrations/google-calendar")
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/google-calendar/callback`
  return getAuthorizationUrl(redirectUri, session.orgId)
}

export async function getDropboxAuthUrl(): Promise<string> {
  const session = await requireRole("assistant")
  const { getAuthorizationUrl } = await import("@/lib/integrations/dropbox")
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/dropbox/callback`
  return getAuthorizationUrl(redirectUri, session.orgId)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Remove keys starting with _ (access tokens, refresh tokens) before sending to client */
function stripSecrets(settings: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!settings) return null
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(settings)) {
    if (!key.startsWith("_")) {
      clean[key] = value
    }
  }
  return clean
}
