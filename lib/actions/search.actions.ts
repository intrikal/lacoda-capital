"use server"

import { sql } from "drizzle-orm"
import { db } from "@/app/db"
import { assets, documents, clients, entities } from "@/app/db/schema"
import { requireAuth } from "@/lib/auth"

// ─── Types ──────────────────────────────────────────────────────────────────

export type SearchResultType = "asset" | "document" | "client" | "entity"

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle: string | null
  href: string
}

export interface GroupedSearchResults {
  assets: SearchResult[]
  documents: SearchResult[]
  clients: SearchResult[]
  entities: SearchResult[]
  total: number
}

// ─── Global search ──────────────────────────────────────────────────────────

export async function globalSearch(query: string): Promise<GroupedSearchResults> {
  const session = await requireAuth()
  if (!session.orgId) return { assets: [], documents: [], clients: [], entities: [], total: 0 }

  const term = `%${query.trim()}%`
  if (query.trim().length === 0) return { assets: [], documents: [], clients: [], entities: [], total: 0 }

  const limit = 5 // max results per type

  // Run all 4 queries in parallel for speed
  const [assetRows, docRows, clientRows, entityRows] = await Promise.all([
    // Assets — search by name and address (in metadata)
    db
      .select({ id: assets.id, name: assets.name, assetClass: assets.assetClass })
      .from(assets)
      .where(
        sql`${assets.name} ILIKE ${term}
          AND ${assets.entityId} IN (
            SELECT e.id FROM entities e
            JOIN clients c ON e.client_id = c.id
            WHERE c.org_id = ${session.orgId}
          )
          AND ${assets.deletedAt} IS NULL`
      )
      .limit(limit),

    // Documents — search by name and tags
    db
      .select({ id: documents.id, name: documents.name, folder: documents.folder })
      .from(documents)
      .where(
        sql`(${documents.name} ILIKE ${term} OR ${term} = ANY(${documents.tags}))
          AND ${documents.orgId} = ${session.orgId}
          AND ${documents.deletedAt} IS NULL`
      )
      .limit(limit),

    // Clients — search by name and company (in metadata)
    db
      .select({ id: clients.id, displayName: clients.displayName, email: clients.email })
      .from(clients)
      .where(
        sql`(${clients.displayName} ILIKE ${term} OR ${clients.email} ILIKE ${term})
          AND ${clients.orgId} = ${session.orgId}
          AND ${clients.deletedAt} IS NULL`
      )
      .limit(limit),

    // Entities — search by name
    db
      .select({ id: entities.id, name: entities.name, entityType: entities.entityType })
      .from(entities)
      .where(
        sql`${entities.name} ILIKE ${term}
          AND ${entities.clientId} IN (
            SELECT c.id FROM clients c WHERE c.org_id = ${session.orgId}
          )
          AND ${entities.deletedAt} IS NULL`
      )
      .limit(limit),
  ])

  const result: GroupedSearchResults = {
    assets: assetRows.map((a) => ({
      id: a.id,
      type: "asset" as const,
      title: a.name,
      subtitle: a.assetClass?.replace(/_/g, " ") ?? null,
      href: `/app/assets?detail=${a.id}`,
    })),
    documents: docRows.map((d) => ({
      id: d.id,
      type: "document" as const,
      title: d.name,
      subtitle: d.folder,
      href: `/app/vault?doc=${d.id}`,
    })),
    clients: clientRows.map((c) => ({
      id: c.id,
      type: "client" as const,
      title: c.displayName,
      subtitle: c.email,
      href: `/app/clients?detail=${c.id}`,
    })),
    entities: entityRows.map((e) => ({
      id: e.id,
      type: "entity" as const,
      title: e.name,
      subtitle: e.entityType?.replace(/_/g, " ") ?? null,
      href: `/app/entities?detail=${e.id}`,
    })),
    total: assetRows.length + docRows.length + clientRows.length + entityRows.length,
  }

  return result
}
