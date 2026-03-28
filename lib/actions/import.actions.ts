"use server"

import { eq, sql } from "drizzle-orm"
import { db } from "@/app/db"
import { assets, entities, clients } from "@/app/db/schema"
import { requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { captureServerEvent } from "@/lib/analytics/posthog-server"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CSVRow {
  [key: string]: string
}

export interface ColumnMapping {
  /** CSV column header → asset field name */
  [csvHeader: string]: string | null
}

export interface ValidatedRow {
  rowIndex: number
  valid: boolean
  errors: string[]
  data: {
    name?: string
    assetClass?: string
    entityName?: string
    entityId?: string
    value?: number
    currency?: string
    description?: string
    address?: string
  }
}

export interface ImportPreview {
  validRows: ValidatedRow[]
  invalidRows: ValidatedRow[]
  totalRows: number
}

export interface ImportResult {
  created: number
  failed: number
  errors: { row: number; message: string }[]
}

// ─── Field definitions for mapping UI ───────────────────────────────────────

export const ASSET_IMPORT_FIELDS = [
  { key: "name", label: "Asset Name", required: true },
  { key: "assetClass", label: "Asset Class", required: false },
  { key: "entityName", label: "Entity Name", required: false },
  { key: "value", label: "Current Value", required: false },
  { key: "currency", label: "Currency", required: false },
  { key: "description", label: "Description", required: false },
  { key: "address", label: "Address", required: false },
] as const

const VALID_ASSET_CLASSES = [
  "real_estate", "equities", "fixed_income", "private_equity",
  "venture_capital", "hedge_funds", "commodities", "cash",
  "crypto", "collectibles", "intellectual_property", "insurance", "other",
]

// ─── Validate mapped CSV data ───────────────────────────────────────────────

export async function validateCSVImport(
  rows: CSVRow[],
  mapping: ColumnMapping
): Promise<ImportPreview> {
  const session = await requireRole("assistant")

  // Get existing entities for fuzzy matching
  const orgEntities = await db
    .select({ id: entities.id, name: entities.name })
    .from(entities)
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(eq(clients.orgId, session.orgId))

  const entityNameMap = new Map(orgEntities.map((e) => [e.name.toLowerCase().trim(), e.id]))

  const validRows: ValidatedRow[] = []
  const invalidRows: ValidatedRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const errors: string[] = []
    const data: ValidatedRow["data"] = {}

    // Map CSV values to fields
    for (const [csvHeader, fieldKey] of Object.entries(mapping)) {
      if (!fieldKey) continue
      const value = row[csvHeader]?.trim()
      if (!value) continue

      switch (fieldKey) {
        case "name":
          data.name = value
          break
        case "assetClass": {
          const normalized = value.toLowerCase().replace(/\s+/g, "_")
          if (VALID_ASSET_CLASSES.includes(normalized)) {
            data.assetClass = normalized
          } else {
            // Try fuzzy match
            const match = VALID_ASSET_CLASSES.find((c) =>
              c.includes(normalized) || normalized.includes(c)
            )
            data.assetClass = match ?? "other"
          }
          break
        }
        case "entityName": {
          data.entityName = value
          // Fuzzy match to existing entity
          const exactMatch = entityNameMap.get(value.toLowerCase().trim())
          if (exactMatch) {
            data.entityId = exactMatch
          } else {
            // Try partial match
            for (const [name, id] of entityNameMap) {
              if (name.includes(value.toLowerCase()) || value.toLowerCase().includes(name)) {
                data.entityId = id
                break
              }
            }
          }
          break
        }
        case "value": {
          const num = parseFloat(value.replace(/[,$]/g, ""))
          if (isNaN(num)) {
            errors.push(`Invalid value: "${value}"`)
          } else {
            data.value = num
          }
          break
        }
        case "currency":
          data.currency = value.toUpperCase().substring(0, 10)
          break
        case "description":
          data.description = value
          break
        case "address":
          data.address = value
          break
      }
    }

    // Validate required fields
    if (!data.name) {
      errors.push("Name is required")
    }

    const validated: ValidatedRow = {
      rowIndex: i + 1, // 1-based for display
      valid: errors.length === 0,
      errors,
      data,
    }

    if (errors.length === 0) {
      validRows.push(validated)
    } else {
      invalidRows.push(validated)
    }
  }

  return {
    validRows,
    invalidRows,
    totalRows: rows.length,
  }
}

// ─── Execute CSV import ─────────────────────────────────────────────────────

export async function executeCSVImport(
  validatedRows: ValidatedRow[]
): Promise<ImportResult> {
  const session = await requireRole("assistant")

  let created = 0
  const errors: { row: number; message: string }[] = []

  // We need at least one entity to assign assets to
  // Get or create a default entity
  const orgEntities = await db
    .select({ id: entities.id, name: entities.name })
    .from(entities)
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(eq(clients.orgId, session.orgId))

  const entityNameMap = new Map(orgEntities.map((e) => [e.name.toLowerCase().trim(), e.id]))
  const defaultEntityId = orgEntities[0]?.id

  if (!defaultEntityId && validatedRows.some((r) => !r.data.entityId)) {
    return {
      created: 0,
      failed: validatedRows.length,
      errors: [{ row: 0, message: "No entities exist. Create an entity first before importing assets." }],
    }
  }

  // Track entity names we've already created (for deduplication)
  const createdEntityNames = new Map<string, string>()

  // Process in chunks of 100
  const CHUNK_SIZE = 100
  for (let i = 0; i < validatedRows.length; i += CHUNK_SIZE) {
    const chunk = validatedRows.slice(i, i + CHUNK_SIZE)

    for (const row of chunk) {
      try {
        let entityId = row.data.entityId ?? defaultEntityId

        // If entityName was provided but no match found, check our created cache
        if (!row.data.entityId && row.data.entityName) {
          const normalizedName = row.data.entityName.toLowerCase().trim()
          const cachedId = createdEntityNames.get(normalizedName) ?? entityNameMap.get(normalizedName)
          if (cachedId) {
            entityId = cachedId
          }
          // If still no match, use default entity
        }

        const [newAsset] = await db
          .insert(assets)
          .values({
            entityId: entityId!,
            name: row.data.name!,
            description: row.data.description ?? null,
            assetClass: (row.data.assetClass as typeof assets.$inferInsert["assetClass"]) ?? "other",
            status: "active",
            currency: row.data.currency ?? "USD",
            currentValue: row.data.value?.toString() ?? null,
            metadata: row.data.address ? { propertyAddress: { street: row.data.address } } : {},
          })
          .returning()

        // Write ledger event for each created asset
        await createLedgerEvent({
          orgId: session.orgId,
          actorId: session.userId,
          action: "created",
          targetType: "asset",
          targetId: newAsset.id,
          metadata: {
            name: row.data.name,
            source: "csv_import",
            rowIndex: row.rowIndex,
          },
        })

        created++
      } catch (err) {
        errors.push({
          row: row.rowIndex,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  captureServerEvent(session.userId, "assets.csv_imported", {
    org_id: session.orgId,
    total_rows: validatedRows.length,
    created,
    failed: errors.length,
  })

  return {
    created,
    failed: errors.length,
    errors,
  }
}
