"use server"

import { eq, and, sql } from "drizzle-orm"
import { db } from "@/app/db"
import { assets, entities, clients } from "@/app/db/schema"
import { requireRole } from "@/lib/auth"
import { createLedgerEvent } from "@/lib/actions/ledger"
import { captureServerEvent } from "@/lib/analytics/server"

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConflictMode = "skip" | "overwrite" | "create"

export interface ImportWizardRow {
  [key: string]: string
}

export interface ImportFieldMapping {
  /** CSV/JSON column name → Lacoda field name */
  [sourceColumn: string]: string | null
}

export interface ImportValidationResult {
  validRows: ImportValidatedRow[]
  invalidRows: ImportValidatedRow[]
  duplicates: ImportValidatedRow[]
  totalRows: number
}

export interface ImportValidatedRow {
  rowIndex: number
  valid: boolean
  isDuplicate: boolean
  existingId: string | null
  errors: string[]
  data: Record<string, unknown>
}

export interface ImportExecutionResult {
  created: number
  updated: number
  skipped: number
  failed: number
  errors: { row: number; message: string }[]
}

// ─── Field definitions for generic import ───────────────────────────────────

export const IMPORTABLE_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "assetClass", label: "Asset Class", required: false },
  { key: "entityName", label: "Entity Name", required: false },
  { key: "value", label: "Current Value", required: false },
  { key: "currency", label: "Currency", required: false },
  { key: "description", label: "Description", required: false },
  { key: "address", label: "Address / Location", required: false },
  { key: "acquisitionDate", label: "Acquisition Date", required: false },
  { key: "status", label: "Status", required: false },
] as const

const VALID_ASSET_CLASSES = [
  "real_estate", "equities", "fixed_income", "private_equity",
  "venture_capital", "hedge_funds", "commodities", "cash",
  "crypto", "collectibles", "intellectual_property", "insurance", "other",
]

// ─── Validate with duplicate detection ──────────────────────────────────────

export async function validateImportWithDuplicates(
  rows: ImportWizardRow[],
  mapping: ImportFieldMapping
): Promise<ImportValidationResult> {
  const session = await requireRole("assistant")

  // Get existing assets for duplicate detection
  const existingAssets = await db
    .select({ id: assets.id, name: assets.name })
    .from(assets)
    .innerJoin(entities, eq(assets.entityId, entities.id))
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(eq(clients.orgId, session.orgId))

  const existingNameMap = new Map(
    existingAssets.map((a) => [a.name.toLowerCase().trim(), a.id])
  )

  // Get entities for matching
  const orgEntities = await db
    .select({ id: entities.id, name: entities.name })
    .from(entities)
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(eq(clients.orgId, session.orgId))

  const entityNameMap = new Map(
    orgEntities.map((e) => [e.name.toLowerCase().trim(), e.id])
  )

  const validRows: ImportValidatedRow[] = []
  const invalidRows: ImportValidatedRow[] = []
  const duplicates: ImportValidatedRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const errors: string[] = []
    const data: Record<string, unknown> = {}

    // Map source values to Lacoda fields
    for (const [sourceCol, fieldKey] of Object.entries(mapping)) {
      if (!fieldKey) continue
      const value = row[sourceCol]?.trim()
      if (!value) continue

      switch (fieldKey) {
        case "name":
          data.name = value
          break
        case "assetClass": {
          const normalized = value.toLowerCase().replace(/\s+/g, "_")
          const match = VALID_ASSET_CLASSES.find((c) =>
            c === normalized || c.includes(normalized) || normalized.includes(c)
          )
          data.assetClass = match ?? "other"
          break
        }
        case "entityName": {
          data.entityName = value
          const match = entityNameMap.get(value.toLowerCase().trim())
          if (match) data.entityId = match
          break
        }
        case "value": {
          const num = parseFloat(value.replace(/[,$€£¥]/g, ""))
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
        case "acquisitionDate":
          data.acquisitionDate = value
          break
        case "status":
          data.status = value.toLowerCase()
          break
      }
    }

    if (!data.name) errors.push("Name is required")

    // Check for duplicates by name + org
    const existingId = data.name
      ? existingNameMap.get((data.name as string).toLowerCase().trim()) ?? null
      : null

    const validated: ImportValidatedRow = {
      rowIndex: i + 1,
      valid: errors.length === 0,
      isDuplicate: existingId !== null,
      existingId,
      errors,
      data,
    }

    if (errors.length > 0) {
      invalidRows.push(validated)
    } else if (existingId) {
      duplicates.push(validated)
    } else {
      validRows.push(validated)
    }
  }

  return {
    validRows,
    invalidRows,
    duplicates,
    totalRows: rows.length,
  }
}

// ─── Execute import with conflict resolution ────────────────────────────────

export async function executeImportWithConflictResolution(
  validatedRows: ImportValidatedRow[],
  duplicateRows: ImportValidatedRow[],
  conflictMode: ConflictMode
): Promise<ImportExecutionResult> {
  const session = await requireRole("assistant")

  let created = 0
  let updated = 0
  let skipped = 0
  const failedErrors: { row: number; message: string }[] = []

  // Get default entity
  const orgEntities = await db
    .select({ id: entities.id })
    .from(entities)
    .innerJoin(clients, eq(entities.clientId, clients.id))
    .where(eq(clients.orgId, session.orgId))
    .limit(1)

  const defaultEntityId = orgEntities[0]?.id

  if (!defaultEntityId) {
    return {
      created: 0, updated: 0, skipped: 0,
      failed: validatedRows.length + duplicateRows.length,
      errors: [{ row: 0, message: "No entities exist. Create an entity first." }],
    }
  }

  // Process new rows (always create)
  const CHUNK_SIZE = 100
  for (let i = 0; i < validatedRows.length; i += CHUNK_SIZE) {
    const chunk = validatedRows.slice(i, i + CHUNK_SIZE)
    for (const row of chunk) {
      try {
        const entityId = (row.data.entityId as string) ?? defaultEntityId
        const [newAsset] = await db
          .insert(assets)
          .values({
            entityId,
            name: row.data.name as string,
            description: (row.data.description as string) ?? null,
            assetClass: (row.data.assetClass as typeof assets.$inferInsert["assetClass"]) ?? "other",
            status: "active",
            currency: (row.data.currency as string) ?? "USD",
            currentValue: row.data.value?.toString() ?? null,
            metadata: row.data.address ? { propertyAddress: row.data.address as Record<string, string> } : {},
          })
          .returning()

        await createLedgerEvent({
          orgId: session.orgId,
          actorId: session.userId,
          action: "created",
          targetType: "asset",
          targetId: newAsset.id,
          metadata: { source: "import_wizard", rowIndex: row.rowIndex },
        })
        created++
      } catch (err) {
        failedErrors.push({
          row: row.rowIndex,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  // Process duplicate rows based on conflict mode
  for (const row of duplicateRows) {
    try {
      switch (conflictMode) {
        case "skip":
          skipped++
          break

        case "overwrite": {
          if (!row.existingId) { skipped++; break }
          const updateData: Record<string, unknown> = {}
          if (row.data.description) updateData.description = row.data.description
          if (row.data.assetClass) updateData.assetClass = row.data.assetClass
          if (row.data.value) updateData.currentValue = row.data.value.toString()
          if (row.data.currency) updateData.currency = row.data.currency

          if (Object.keys(updateData).length > 0) {
            await db.update(assets).set(updateData).where(eq(assets.id, row.existingId))
            await createLedgerEvent({
              orgId: session.orgId,
              actorId: session.userId,
              action: "updated",
              targetType: "asset",
              targetId: row.existingId,
              metadata: { source: "import_wizard_overwrite", rowIndex: row.rowIndex },
            })
          }
          updated++
          break
        }

        case "create": {
          const entityId = (row.data.entityId as string) ?? defaultEntityId
          const [newAsset] = await db
            .insert(assets)
            .values({
              entityId,
              name: row.data.name as string,
              description: (row.data.description as string) ?? null,
              assetClass: (row.data.assetClass as typeof assets.$inferInsert["assetClass"]) ?? "other",
              status: "active",
              currency: (row.data.currency as string) ?? "USD",
              currentValue: row.data.value?.toString() ?? null,
              metadata: row.data.address ? { propertyAddress: row.data.address as Record<string, string> } : {},
            })
            .returning()

          await createLedgerEvent({
            orgId: session.orgId,
            actorId: session.userId,
            action: "created",
            targetType: "asset",
            targetId: newAsset.id,
            metadata: { source: "import_wizard_force_create", rowIndex: row.rowIndex },
          })
          created++
          break
        }
      }
    } catch (err) {
      failedErrors.push({
        row: row.rowIndex,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const result = {
    created,
    updated,
    skipped,
    failed: failedErrors.length,
    errors: failedErrors,
  }

  if (created > 0 || updated > 0) {
    captureServerEvent(session.userId, "import.wizard_completed", {
      row_count: created + updated + skipped + failedErrors.length,
      created,
      updated,
      skipped,
    })
  }

  return result
}
