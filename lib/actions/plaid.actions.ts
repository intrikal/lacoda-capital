"use server"

import { requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import {
  getIntegrationByProvider,
  disconnectIntegration,
} from "@/lib/services/integrations.service"

/**
 * getPlaidLinkToken — Creates a Plaid Link token via the Edge Function.
 * Called when user clicks "Connect Bank" in the integrations page.
 */
export async function getPlaidLinkToken(): Promise<{
  link_token: string
  expiration: string
}> {
  const session = await requireRole("admin")

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-link-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ orgId: session.orgId }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error ?? "Failed to create Plaid Link token")
  }

  return res.json()
}

/**
 * exchangePlaidToken — Exchanges a Plaid public token for access token,
 * pulls initial balances, and creates assets.
 */
export async function exchangePlaidToken(input: {
  publicToken: string
  entityId: string
  institutionName?: string
  institutionId?: string
  accounts?: Array<{
    id: string
    name: string
    mask?: string | null
    type: string
    subtype?: string | null
  }>
}): Promise<{ integrationId: string; assetsCreated: number }> {
  const session = await requireRole("admin")

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-exchange-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        ...input,
        orgId: session.orgId,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error ?? "Failed to exchange Plaid token")
  }

  return res.json()
}

/**
 * triggerPlaidSync — Manually triggers a balance sync for the org's Plaid integration.
 */
export async function triggerPlaidSync(integrationId?: string): Promise<{
  synced: number
  failed: number
}> {
  const session = await requireRole("assistant")

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-balances`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        integrationId,
        mode: "manual",
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(err.error ?? "Failed to trigger sync")
  }

  const result = await res.json()

  await createLedgerEvent({
    orgId: session.orgId!,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: integrationId ?? "all-plaid",
    metadata: { action: "manual_sync", ...result },
  })

  return result
}

/**
 * getPlaidIntegration — Returns the Plaid integration for the current org.
 */
export async function getPlaidIntegration() {
  const session = await requireRole("client")
  if (!session.orgId) return null
  return getIntegrationByProvider(session.orgId, "plaid")
}

/**
 * disconnectPlaid — Disconnects the Plaid integration.
 */
export async function disconnectPlaid(): Promise<void> {
  const session = await requireRole("admin")
  if (!session.orgId) throw new Error("No organization")

  await disconnectIntegration(session.orgId, "plaid")

  await createLedgerEvent({
    orgId: session.orgId,
    actorId: session.userId,
    action: "updated",
    targetType: "org",
    targetId: "plaid",
    metadata: { action: "disconnected" },
  })
}
