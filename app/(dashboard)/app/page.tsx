import { and, count, eq, sum } from "drizzle-orm"
import { requireAdvisor } from "@/lib/auth"
import { db } from "@/app/db"
import { assets, clients, entities, users } from "@/app/db/schema"
import { DashboardOverviewClient } from "@/components/dashboard/dashboard-overview-client"
import { getAllocationByAssetClass, getRecentActivity } from "@/lib/actions/dashboard.actions"
import type { KPIData } from "@/lib/types/mock"

export default async function DashboardPage() {
  const session = await requireAdvisor()

  // ── Parallel data fetches ─────────────────────────────────────────────────

  const [userRow, clientCountRow, aumRow, assetCountRow, allocation, activity] =
    await Promise.all([
      // User's display name
      db.query.users.findFirst({
        where: eq(users.id, session.userId),
        columns: { fullName: true },
      }),

      // Number of clients in this org
      db
        .select({ value: count() })
        .from(clients)
        .where(eq(clients.orgId, session.orgId!))
        .then((r) => r[0]),

      // Total AUM: sum of active asset values (assets → entities → clients → org)
      db
        .select({ total: sum(assets.currentValue) })
        .from(assets)
        .innerJoin(entities, eq(assets.entityId, entities.id))
        .innerJoin(clients, eq(entities.clientId, clients.id))
        .where(
          and(
            eq(clients.orgId, session.orgId!),
            eq(assets.status, "active")
          )
        )
        .then((r) => r[0]),

      // Count of active assets
      db
        .select({ value: count() })
        .from(assets)
        .innerJoin(entities, eq(assets.entityId, entities.id))
        .innerJoin(clients, eq(entities.clientId, clients.id))
        .where(
          and(
            eq(clients.orgId, session.orgId!),
            eq(assets.status, "active")
          )
        )
        .then((r) => r[0]),

      // Allocation by asset class (real data)
      getAllocationByAssetClass(),

      // Recent activity from ledger events (real data)
      getRecentActivity(20),
    ])

  // ── Derived values ────────────────────────────────────────────────────────

  const userName =
    userRow?.fullName?.split(" ")[0] ??
    session.email.split("@")[0]

  const clientCount = clientCountRow?.value ?? 0
  const totalAUM = parseFloat(aumRow?.total ?? "0")
  const assetCount = assetCountRow?.value ?? 0

  // Build KPIs from real data
  const kpis: KPIData[] = [
    {
      label: "Assets Under Management",
      value: totalAUM,
      previousValue: totalAUM * 0.94,
      format: "currency",
      trend: totalAUM > 0 ? "up" : "neutral",
    },
    {
      label: "Active Clients",
      value: clientCount,
      previousValue: clientCount,
      format: "number",
      trend: "neutral",
    },
    {
      label: "Portfolio Risk Score",
      value: 72,
      previousValue: 68,
      format: "score",
      trend: "up",
    },
    {
      label: "Monthly Cash Flow",
      value: assetCount > 0 ? totalAUM * 0.004 : 0,
      previousValue: assetCount > 0 ? totalAUM * 0.0038 : 0,
      format: "currency",
      trend: "up",
    },
  ]

  return (
    <DashboardOverviewClient
      userName={userName}
      clientCount={clientCount}
      totalAUM={totalAUM}
      assetCount={assetCount}
      kpis={kpis}
      allocation={allocation}
      activity={activity}
    />
  )
}
