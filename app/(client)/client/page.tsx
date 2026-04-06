import { and, eq, isNull, sum } from "drizzle-orm"
import { requireClient } from "@/lib/auth"
import { db } from "@/app/db"
import { assets, clients, entities, goals as goalsTable, orgMembers, users } from "@/app/db/schema"
import { ClientOverviewClient } from "@/components/client/client-overview-client"

const CLASS_COLORS: Record<string, string> = {
  real_estate: "#14b8a6",
  equities: "#06b6d4",
  private_equity: "#8b5cf6",
  fixed_income: "#f59e0b",
  venture_capital: "#ec4899",
  hedge_funds: "#f97316",
  commodities: "#10b981",
  cash: "#6366f1",
  crypto: "#ec4899",
  collectibles: "#a855f7",
  intellectual_property: "#0ea5e9",
  insurance: "#84cc16",
  other: "#71717a",
}

const CLASS_LABELS: Record<string, string> = {
  real_estate: "Real Estate",
  equities: "Equities",
  private_equity: "Private Equity",
  fixed_income: "Fixed Income",
  venture_capital: "Venture Capital",
  hedge_funds: "Hedge Funds",
  commodities: "Commodities",
  cash: "Cash",
  crypto: "Crypto",
  collectibles: "Collectibles",
  intellectual_property: "IP",
  insurance: "Insurance",
  other: "Other",
}

const GOAL_CATEGORY_COLORS: Record<string, string> = {
  retirement: "#0FBFBF",
  realestate: "#06b6d4",
  emergency: "#8b5cf6",
  education: "#f59e0b",
  travel: "#ec4899",
  vehicle: "#f97316",
  investment: "#10b981",
  custom: "#6366f1",
}

export default async function ClientDashboardPage() {
  const session = await requireClient()

  // Resolve this user's clientId via their org_members record
  const memberRow = await db.query.orgMembers.findFirst({
    where: eq(orgMembers.id, session.memberId!),
    columns: { clientId: true },
  })
  const clientId = memberRow?.clientId ?? null

  const [userRow, portfolioRow, allocationRows, clientGoals] = await Promise.all([
    // User's display name
    db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { fullName: true },
    }),

    // Total active asset value: assets → entities → clients scoped to this client
    clientId
      ? db
          .select({ total: sum(assets.currentValue) })
          .from(assets)
          .innerJoin(entities, eq(assets.entityId, entities.id))
          .innerJoin(clients, eq(entities.clientId, clients.id))
          .where(
            and(
              eq(clients.id, clientId),
              eq(assets.status, "active"),
              isNull(assets.deletedAt),
            )
          )
          .then((r) => r[0])
      : Promise.resolve({ total: "0" }),

    // Allocation breakdown by asset class (same join chain)
    clientId
      ? db
          .select({ assetClass: assets.assetClass, total: sum(assets.currentValue) })
          .from(assets)
          .innerJoin(entities, eq(assets.entityId, entities.id))
          .innerJoin(clients, eq(entities.clientId, clients.id))
          .where(
            and(
              eq(clients.id, clientId),
              eq(assets.status, "active"),
              isNull(assets.deletedAt),
            )
          )
          .groupBy(assets.assetClass)
      : Promise.resolve([]),

    // Financial goals for this client
    clientId
      ? db
          .select()
          .from(goalsTable)
          .where(and(eq(goalsTable.clientId, clientId), eq(goalsTable.orgId, session.orgId!)))
      : Promise.resolve([]),
  ])

  const userName =
    userRow?.fullName?.split(" ")[0] ?? session.email.split("@")[0]

  const portfolioValue = parseFloat(portfolioRow?.total ?? "0")

  const allocationData = allocationRows
    .filter((r) => r.total && parseFloat(r.total) > 0)
    .map((r) => ({
      name: CLASS_LABELS[r.assetClass] ?? r.assetClass,
      value: parseFloat(r.total!),
      color: CLASS_COLORS[r.assetClass] ?? "#71717a",
    }))
    .sort((a, b) => b.value - a.value)

  const goals = clientGoals.map((g) => ({
    name: g.name,
    current: g.currentAmount,
    target: g.targetAmount,
    color: GOAL_CATEGORY_COLORS[g.category] ?? "#0FBFBF",
  }))

  return (
    <ClientOverviewClient
      userName={userName}
      portfolioValue={portfolioValue}
      allocationData={allocationData}
      goals={goals}
    />
  )
}
