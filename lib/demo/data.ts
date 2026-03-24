/**
 * Demo mode pre-seeded data.
 * Read-only mock data displayed in the /demo/app/* routes.
 * No auth required. No real database queries.
 */

export const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001"

export const demoKpis = [
  { label: "Assets Under Management", value: 24500000, previousValue: 23000000, format: "currency" as const, trend: "up" as const },
  { label: "Active Clients", value: 12, previousValue: 11, format: "number" as const, trend: "up" as const },
  { label: "Portfolio Risk Score", value: 68, previousValue: 72, format: "score" as const, trend: "down" as const },
  { label: "Monthly Cash Flow", value: 98000, previousValue: 92000, format: "currency" as const, trend: "up" as const },
]

export const demoAllocation = [
  { name: "Real Estate", value: 8200000, color: "#14b8a6" },
  { name: "Public Equities", value: 5800000, color: "#06b6d4" },
  { name: "Private Equity", value: 4200000, color: "#8b5cf6" },
  { name: "Fixed Income", value: 3100000, color: "#f59e0b" },
  { name: "Cash & Equivalents", value: 1800000, color: "#10b981" },
  { name: "Alternative Assets", value: 1400000, color: "#ec4899" },
]

export const demoActivity = [
  {
    id: "demo-1",
    action: "created",
    targetType: "asset",
    targetId: "demo-asset-1",
    actorName: "Sarah Johnson",
    payload: { name: "Downtown Office Complex" },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-2",
    action: "document_uploaded",
    targetType: "document",
    targetId: "demo-doc-1",
    actorName: "Michael Chen",
    payload: { name: "Q4 Financial Statement" },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-3",
    action: "report_generated",
    targetType: "report",
    targetId: "demo-report-1",
    actorName: "Sarah Johnson",
    payload: { name: "Annual Portfolio Review" },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-4",
    action: "compliance_approved",
    targetType: "document",
    targetId: "demo-doc-2",
    actorName: "Emily Patel",
    payload: { name: "KYC Verification - Smith Trust" },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
]

export const demoClients = [
  { id: "demo-c1", displayName: "Johnson Family Office", clientType: "institution", totalAUM: 8500000, entityCount: 3, assetCount: 12, clientStatus: "active" },
  { id: "demo-c2", displayName: "Smith Revocable Trust", clientType: "trust", totalAUM: 4200000, entityCount: 2, assetCount: 8, clientStatus: "active" },
  { id: "demo-c3", displayName: "Chen Family Holdings", clientType: "institution", totalAUM: 6800000, entityCount: 4, assetCount: 15, clientStatus: "active" },
  { id: "demo-c4", displayName: "Patricia Williams", clientType: "individual", totalAUM: 2100000, entityCount: 1, assetCount: 5, clientStatus: "active" },
  { id: "demo-c5", displayName: "Patel Enterprises LLC", clientType: "institution", totalAUM: 2900000, entityCount: 2, assetCount: 7, clientStatus: "active" },
]

export const demoAssets = [
  { id: "demo-a1", name: "Downtown Office Complex", assetClass: "real_estate", currentValue: 4500000, status: "active", entityName: "Johnson Holdings LLC" },
  { id: "demo-a2", name: "Tech Growth Fund", assetClass: "equities", currentValue: 2800000, status: "active", entityName: "Chen Family Trust" },
  { id: "demo-a3", name: "Series B - FinTech Startup", assetClass: "private_equity", currentValue: 1200000, status: "active", entityName: "Smith Trust" },
  { id: "demo-a4", name: "Manhattan Penthouse", assetClass: "real_estate", currentValue: 3700000, status: "active", entityName: "Johnson Holdings LLC" },
  { id: "demo-a5", name: "Municipal Bond Portfolio", assetClass: "fixed_income", currentValue: 1500000, status: "active", entityName: "Williams Personal" },
  { id: "demo-a6", name: "Venture Capital Fund III", assetClass: "venture_capital", currentValue: 900000, status: "active", entityName: "Patel Enterprises" },
]

export const demoComplianceStats = {
  score: 73,
  active: 15,
  verified: 11,
  overdue: 2,
  byFramework: {
    "SOC2": { total: 8, verified: 6 },
    "CUSTOM": { total: 5, verified: 4 },
    "GDPR": { total: 2, verified: 1 },
  },
}
