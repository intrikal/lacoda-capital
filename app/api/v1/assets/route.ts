import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { eq, and, isNull, inArray } from "drizzle-orm"
import { db } from "@/app/db"
import { assets, entities, clients } from "@/app/db/schema"
import { authenticateApiRequest, parseJsonBody, apiResponse } from "@/lib/api-middleware"
import { createLedgerEvent } from "@/lib/actions/ledger"

/**
 * GET /api/v1/assets
 *
 * List all assets for the authenticated org.
 * Supports query params: entity_id, asset_class, status
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  if (authResult instanceof NextResponse) return authResult

  const { orgId, keyName } = authResult
  const { searchParams } = request.nextUrl

  // Build filters
  const entityId = searchParams.get("entity_id")
  const assetClass = searchParams.get("asset_class")
  const status = searchParams.get("status")
  const limitParam = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500)
  const offsetParam = parseInt(searchParams.get("offset") ?? "0")

  try {
    // Entities belong to clients, which belong to orgs — join through clients
    const orgClients = await db.query.clients.findMany({
      where: and(eq(clients.orgId, orgId), isNull(clients.deletedAt)),
      columns: { id: true },
    })
    const clientIds = orgClients.map((c) => c.id)

    const orgEntities = clientIds.length > 0
      ? await db.query.entities.findMany({
          where: and(
            inArray(entities.clientId, clientIds),
            isNull(entities.deletedAt)
          ),
          columns: { id: true },
        })
      : []

    const entityIds = entityId
      ? orgEntities.filter((e) => e.id === entityId).map((e) => e.id)
      : orgEntities.map((e) => e.id)

    if (entityIds.length === 0) {
      return apiResponse({ data: [], total: 0, limit: limitParam, offset: offsetParam })
    }

    // Fetch assets belonging to these entities
    const allAssets = await db.query.assets.findMany({
      where: and(
        isNull(assets.deletedAt),
        ...(assetClass ? [eq(assets.assetClass, assetClass as typeof assets.assetClass.enumValues[number])] : []),
        ...(status ? [eq(assets.status, status as typeof assets.status.enumValues[number])] : []),
      ),
    })

    // Filter by org-owned entities (application-level RLS)
    const entityIdSet = new Set(entityIds)
    const filtered = allAssets.filter((a) => entityIdSet.has(a.entityId))
    const paged = filtered.slice(offsetParam, offsetParam + limitParam)

    return apiResponse({
      data: paged.map(serializeAsset),
      total: filtered.length,
      limit: limitParam,
      offset: offsetParam,
    })
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("api_route", "/api/v1/assets")
      scope.captureException(err instanceof Error ? err : new Error(String(err)))
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/v1/assets
 *
 * Create a new asset.
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  if (authResult instanceof NextResponse) return authResult

  const { orgId, keyId, keyName } = authResult

  const bodyResult = await parseJsonBody(request)
  if (bodyResult instanceof NextResponse) return bodyResult

  const { data } = bodyResult
  const errors: string[] = []

  // Validate required fields
  if (!data.entity_id) errors.push("entity_id is required")
  if (!data.name) errors.push("name is required")
  if (!data.asset_class) errors.push("asset_class is required")

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    )
  }

  // Verify entity belongs to this org (entities → clients → orgs)
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, data.entity_id as string),
      isNull(entities.deletedAt)
    ),
    with: { client: { columns: { orgId: true } } },
  })

  if (!entity || (entity.client as { orgId: string })?.orgId !== orgId) {
    return NextResponse.json(
      { error: "Entity not found or does not belong to your organization" },
      { status: 404 }
    )
  }

  try {
    const [created] = await db
      .insert(assets)
      .values({
        entityId: data.entity_id as string,
        name: data.name as string,
        assetClass: data.asset_class as typeof assets.assetClass.enumValues[number],
        status: (data.status as typeof assets.status.enumValues[number]) ?? "active",
        description: (data.description as string) ?? null,
        currentValue: (data.current_value as string) ?? null,
        acquisitionDate: data.acquisition_date ? new Date(data.acquisition_date as string) : null,
        acquisitionCost: (data.acquisition_cost as string) ?? null,
        metadata: (data.metadata as Record<string, unknown>) ?? {},
      })
      .returning()

    await createLedgerEvent({
      orgId,
      actorId: null,
      action: "created",
      targetType: "asset",
      targetId: created.id,
      metadata: { actorType: "api_key", keyId, keyName },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    })

    return apiResponse({ data: serializeAsset(created) }, undefined, 201)
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("api_route", "/api/v1/assets")
      scope.captureException(err instanceof Error ? err : new Error(String(err)))
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function serializeAsset(a: typeof assets.$inferSelect) {
  return {
    id: a.id,
    entity_id: a.entityId,
    name: a.name,
    description: a.description,
    asset_class: a.assetClass,
    status: a.status,
    current_value: a.currentValue,
    acquisition_date: a.acquisitionDate?.toISOString() ?? null,
    acquisition_cost: a.acquisitionCost,
    metadata: a.metadata,
    created_at: a.createdAt.toISOString(),
    updated_at: a.updatedAt.toISOString(),
  }
}
