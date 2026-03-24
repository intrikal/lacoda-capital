"use server"

import { db } from "@/app/db"
import { integrations } from "@/app/db/schema"
import { eq, and } from "drizzle-orm"

export type IntegrationRecord = {
  id: string
  orgId: string
  provider: string
  name: string
  status: string
  statusMessage: string | null
  externalAccountId: string | null
  externalItemId: string | null
  lastSyncAt: string | null
  lastSyncStatus: string | null
  syncErrorMessage: string | null
  settings: Record<string, unknown>
  syncHistory: unknown[]
  connectedBy: string | null
  connectedAt: string | null
  createdAt: string
  updatedAt: string
}

function toRecord(row: typeof integrations.$inferSelect): IntegrationRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    provider: row.provider,
    name: row.name,
    status: row.status,
    statusMessage: row.statusMessage,
    externalAccountId: row.externalAccountId,
    externalItemId: row.externalItemId,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastSyncStatus: row.lastSyncStatus,
    syncErrorMessage: row.syncErrorMessage,
    settings: (row.settings as Record<string, unknown>) ?? {},
    syncHistory: ((row as Record<string, unknown>).syncHistory as unknown[]) ?? [],
    connectedBy: row.connectedBy,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getIntegrations(orgId: string): Promise<IntegrationRecord[]> {
  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.orgId, orgId))
  return rows.map(toRecord)
}

export async function getIntegrationByProvider(
  orgId: string,
  provider: string
): Promise<IntegrationRecord | null> {
  const row = await db.query.integrations.findFirst({
    where: and(eq(integrations.orgId, orgId), eq(integrations.provider, provider as typeof integrations.provider.enumValues[number])),
  })
  return row ? toRecord(row) : null
}

export async function getIntegrationById(id: string): Promise<IntegrationRecord | null> {
  const row = await db.query.integrations.findFirst({
    where: eq(integrations.id, id),
  })
  return row ? toRecord(row) : null
}

export async function disconnectIntegration(
  orgId: string,
  provider: string
): Promise<void> {
  await db
    .update(integrations)
    .set({
      status: "disconnected",
      statusMessage: "Disconnected by user",
      lastSyncStatus: null,
      syncErrorMessage: null,
    })
    .where(
      and(
        eq(integrations.orgId, orgId),
        eq(integrations.provider, provider as typeof integrations.provider.enumValues[number])
      )
    )
}
