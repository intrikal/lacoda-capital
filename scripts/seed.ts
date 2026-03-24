/**
 * scripts/seed.ts — Database Seed Script
 *
 * Populates the database with realistic demo data for development.
 * Idempotent: truncates all seeded tables before inserting.
 *
 * Run: npx tsx scripts/seed.ts
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { sql } from "drizzle-orm"
import * as schema from "../app/db/schema"

// ─── Load env files (dotenv v17 doesn't populate process.env reliably) ───────

function loadEnvFile(filename: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), filename), "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIdx = trimmed.indexOf("=")
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* file not found — skip */ }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

// ─── DB connection ───────────────────────────────────────────────────────────

// Use DIRECT_URL (bypasses PgBouncer) — same as drizzle-kit migrations
const pool = new Pool({ connectionString: process.env.DIRECT_URL! })
const db = drizzle(pool, { schema })

// ─── Deterministic UUIDs (stable across re-runs) ────────────────────────────

function uuid(n: number): string {
  const hex = n.toString(16).padStart(12, "0")
  return `00000000-0000-4000-a000-${hex}`
}

// Org IDs
const ORG_1 = uuid(1) // Blackstone Wealth Partners
const ORG_2 = uuid(2) // Meridian Capital Advisors

// User IDs (these would match Supabase auth.users in real setup)
const USER_SARAH = uuid(10)
const USER_MICHAEL = uuid(11)
const USER_JAMES = uuid(12)
const USER_EMILY = uuid(13)

// Client IDs
const CLIENT_BLACKWOOD = uuid(20)
const CLIENT_WELLINGTON = uuid(21)
const CLIENT_MERIDIAN_C = uuid(22)
const CLIENT_CHEN = uuid(23)
const CLIENT_PATTERSON = uuid(24)

// Entity IDs (10 entities, 3-level hierarchy)
const ENT_BLACKWOOD_PERSONAL = uuid(30)
const ENT_BLACKWOOD_LLC = uuid(31)
const ENT_BLACKWOOD_TRUST = uuid(32)
const ENT_WELLINGTON_PERSONAL = uuid(33)
const ENT_WELLINGTON_TRUST = uuid(34)
const ENT_WELLINGTON_CORP = uuid(35)
const ENT_MERIDIAN_PERSONAL = uuid(36)
const ENT_CHEN_LLC = uuid(37)
const ENT_CHEN_TRUST = uuid(38)
const ENT_PATTERSON_PERSONAL = uuid(39)

// Asset IDs (20 assets)
const ASSET_IDS = Array.from({ length: 20 }, (_, i) => uuid(100 + i))

// Document IDs (30 documents)
const DOC_IDS = Array.from({ length: 30 }, (_, i) => uuid(200 + i))

// Compliance control IDs (5 controls)
const CTRL_IDS = Array.from({ length: 5 }, (_, i) => uuid(300 + i))

// ─── Seed data ──────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...")

  // ── Truncate in reverse FK order ──────────────────────────────────────────
  console.log("  Truncating tables...")
  await db.execute(sql`
    TRUNCATE TABLE
      compliance_evidence,
      compliance_controls,
      notifications,
      ledger_events,
      valuations,
      documents,
      assets,
      entities,
      assignments,
      org_members,
      clients,
      users,
      orgs
    CASCADE
  `)

  // ── 1. Orgs (2) ──────────────────────────────────────────────────────────
  console.log("  Inserting orgs...")
  await db.insert(schema.orgs).values([
    {
      id: ORG_1,
      name: "Blackstone Wealth Partners",
      slug: "blackstone-wealth",
      settings: {
        timezone: "America/New_York",
        currency: "USD",
        features: { complianceModule: true, clientPortal: true, customReports: true },
      },
    },
    {
      id: ORG_2,
      name: "Meridian Capital Advisors",
      slug: "meridian-capital",
      settings: {
        timezone: "America/Chicago",
        currency: "USD",
        features: { complianceModule: true, clientPortal: true },
      },
    },
  ])

  // ── 2. Users (4) ─────────────────────────────────────────────────────────
  console.log("  Inserting users...")
  await db.insert(schema.users).values([
    {
      id: USER_SARAH,
      email: "sarah.chen@blackstone-wealth.com",
      fullName: "Sarah Chen",
      phone: "+1-212-555-0101",
      preferences: { theme: "dark", notifications: { email: true, inApp: true, taskReminders: true } },
    },
    {
      id: USER_MICHAEL,
      email: "michael.roberts@blackstone-wealth.com",
      fullName: "Michael Roberts",
      phone: "+1-212-555-0102",
      preferences: { theme: "light", notifications: { email: true, inApp: true } },
    },
    {
      id: USER_JAMES,
      email: "james.wilson@blackstone-wealth.com",
      fullName: "James Wilson",
      preferences: { theme: "system" },
    },
    {
      id: USER_EMILY,
      email: "emily.watson@meridian-capital.com",
      fullName: "Emily Watson",
      phone: "+1-312-555-0201",
      preferences: { theme: "dark" },
    },
  ])

  // ── 3. Org Members (6) ───────────────────────────────────────────────────
  console.log("  Inserting org_members...")
  await db.insert(schema.orgMembers).values([
    // Blackstone: Sarah (admin), Michael (admin), James (assistant)
    { orgId: ORG_1, userId: USER_SARAH, role: "admin" as const },
    { orgId: ORG_1, userId: USER_MICHAEL, role: "admin" as const },
    { orgId: ORG_1, userId: USER_JAMES, role: "assistant" as const },
    // Meridian: Emily (admin), Sarah also consults for Meridian
    { orgId: ORG_2, userId: USER_EMILY, role: "admin" as const },
    { orgId: ORG_2, userId: USER_SARAH, role: "assistant" as const },
    // James also at Meridian as assistant
    { orgId: ORG_2, userId: USER_JAMES, role: "assistant" as const },
  ])

  // ── 4. Clients (5) ───────────────────────────────────────────────────────
  console.log("  Inserting clients...")
  await db.insert(schema.clients).values([
    {
      id: CLIENT_BLACKWOOD,
      orgId: ORG_1,
      displayName: "Blackwood Capital Group",
      email: "office@blackwoodcapital.com",
      phone: "+1-212-555-1000",
      profile: { clientType: "institution", clientStatus: "active", tags: ["vip", "high-net-worth"] },
    },
    {
      id: CLIENT_WELLINGTON,
      orgId: ORG_1,
      displayName: "Wellington Trust Family",
      email: "trust@wellingtonfamily.com",
      profile: { clientType: "trust", clientStatus: "active", tags: ["estate-planning"] },
    },
    {
      id: CLIENT_MERIDIAN_C,
      orgId: ORG_1,
      displayName: "Meridian Capital Holdings",
      email: "info@meridiancap.com",
      profile: { clientType: "institution", clientStatus: "active" },
    },
    {
      id: CLIENT_CHEN,
      orgId: ORG_2,
      displayName: "Chen Holdings International",
      email: "david.chen@chenholdings.com",
      phone: "+1-312-555-2000",
      profile: { clientType: "institution", clientStatus: "active", tags: ["international"] },
    },
    {
      id: CLIENT_PATTERSON,
      orgId: ORG_2,
      displayName: "Richard Patterson",
      email: "richard@pattersonwealth.com",
      profile: { clientType: "individual", clientStatus: "active" },
    },
  ])

  // ── 5. Entities (10 with 3-level hierarchy) ──────────────────────────────
  console.log("  Inserting entities...")
  await db.insert(schema.entities).values([
    // Blackwood: personal + LLC + trust (3 levels under one client)
    { id: ENT_BLACKWOOD_PERSONAL, clientId: CLIENT_BLACKWOOD, name: "Blackwood Personal Account", entityType: "personal" as const },
    { id: ENT_BLACKWOOD_LLC, clientId: CLIENT_BLACKWOOD, name: "Blackwood Investments LLC", entityType: "llc" as const, jurisdiction: "Delaware", taxId: "12-3456789" },
    { id: ENT_BLACKWOOD_TRUST, clientId: CLIENT_BLACKWOOD, name: "Blackwood Family Trust", entityType: "trust" as const, metadata: { trustType: "irrevocable", trustees: ["Robert Blackwood", "First National Bank"] } },
    // Wellington: personal + trust + corp
    { id: ENT_WELLINGTON_PERSONAL, clientId: CLIENT_WELLINGTON, name: "Wellington Personal", entityType: "personal" as const },
    { id: ENT_WELLINGTON_TRUST, clientId: CLIENT_WELLINGTON, name: "Wellington Dynasty Trust", entityType: "trust" as const, metadata: { trustType: "irrevocable", trustees: ["Wellington & Associates"] } },
    { id: ENT_WELLINGTON_CORP, clientId: CLIENT_WELLINGTON, name: "Wellington Holdings Corp", entityType: "corporation" as const, jurisdiction: "Nevada", taxId: "98-7654321" },
    // Meridian
    { id: ENT_MERIDIAN_PERSONAL, clientId: CLIENT_MERIDIAN_C, name: "Meridian Capital Fund I", entityType: "partnership" as const, jurisdiction: "Delaware" },
    // Chen
    { id: ENT_CHEN_LLC, clientId: CLIENT_CHEN, name: "Chen International LLC", entityType: "llc" as const, jurisdiction: "Wyoming" },
    { id: ENT_CHEN_TRUST, clientId: CLIENT_CHEN, name: "Chen Family Trust", entityType: "trust" as const, metadata: { trustType: "revocable", trustees: ["David Chen", "Li Wei Chen"] } },
    // Patterson
    { id: ENT_PATTERSON_PERSONAL, clientId: CLIENT_PATTERSON, name: "Patterson Individual Account", entityType: "personal" as const },
  ])

  // ── 6. Assets (20 across all asset classes) ──────────────────────────────
  console.log("  Inserting assets...")

  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000)

  const assetRows = [
    // Real Estate (4)
    { id: ASSET_IDS[0], entityId: ENT_BLACKWOOD_LLC, name: "Manhattan Office Tower - 5th Ave", assetClass: "real_estate" as const, acquisitionCost: "12500000.00", currentValue: "14200000.00", valuedAt: daysAgo(15), acquisitionDate: daysAgo(730), description: "Class A office building, 45,000 sqft", metadata: { propertyType: "commercial", squareFeet: 45000 } },
    { id: ASSET_IDS[1], entityId: ENT_BLACKWOOD_TRUST, name: "Hamptons Beach House", assetClass: "real_estate" as const, acquisitionCost: "4800000.00", currentValue: "5600000.00", valuedAt: daysAgo(30), acquisitionDate: daysAgo(1095) },
    { id: ASSET_IDS[2], entityId: ENT_WELLINGTON_CORP, name: "Chicago Mixed-Use Development", assetClass: "real_estate" as const, acquisitionCost: "8200000.00", currentValue: "9100000.00", valuedAt: daysAgo(20), acquisitionDate: daysAgo(365), metadata: { propertyType: "mixed-use" } },
    { id: ASSET_IDS[3], entityId: ENT_CHEN_LLC, name: "San Francisco Condo Portfolio", assetClass: "real_estate" as const, acquisitionCost: "3200000.00", currentValue: "3500000.00", valuedAt: daysAgo(45), acquisitionDate: daysAgo(540) },
    // Equities (4)
    { id: ASSET_IDS[4], entityId: ENT_BLACKWOOD_PERSONAL, name: "Apple Inc (AAPL)", assetClass: "equities" as const, acquisitionCost: "450000.00", currentValue: "625000.00", valuedAt: daysAgo(1), metadata: { ticker: "AAPL", shares: 3500 } },
    { id: ASSET_IDS[5], entityId: ENT_WELLINGTON_PERSONAL, name: "S&P 500 Index Fund (VOO)", assetClass: "equities" as const, acquisitionCost: "2000000.00", currentValue: "2450000.00", valuedAt: daysAgo(1), metadata: { ticker: "VOO", shares: 5500 } },
    { id: ASSET_IDS[6], entityId: ENT_PATTERSON_PERSONAL, name: "Microsoft Corp (MSFT)", assetClass: "equities" as const, acquisitionCost: "180000.00", currentValue: "275000.00", valuedAt: daysAgo(1), metadata: { ticker: "MSFT", shares: 650 } },
    { id: ASSET_IDS[7], entityId: ENT_MERIDIAN_PERSONAL, name: "Tech Growth Portfolio", assetClass: "equities" as const, acquisitionCost: "5000000.00", currentValue: "6200000.00", valuedAt: daysAgo(2) },
    // Fixed Income (3)
    { id: ASSET_IDS[8], entityId: ENT_BLACKWOOD_TRUST, name: "US Treasury Bonds 10Y", assetClass: "fixed_income" as const, acquisitionCost: "1000000.00", currentValue: "985000.00", valuedAt: daysAgo(5) },
    { id: ASSET_IDS[9], entityId: ENT_WELLINGTON_TRUST, name: "Corporate Bond Fund", assetClass: "fixed_income" as const, acquisitionCost: "3000000.00", currentValue: "3050000.00", valuedAt: daysAgo(3) },
    { id: ASSET_IDS[10], entityId: ENT_CHEN_TRUST, name: "Municipal Bond Portfolio", assetClass: "fixed_income" as const, acquisitionCost: "750000.00", currentValue: "760000.00", valuedAt: daysAgo(7) },
    // Private Equity (2)
    { id: ASSET_IDS[11], entityId: ENT_BLACKWOOD_LLC, name: "Sequoia Capital Fund XIV", assetClass: "private_equity" as const, acquisitionCost: "2000000.00", currentValue: "2800000.00", valuedAt: daysAgo(90) },
    { id: ASSET_IDS[12], entityId: ENT_MERIDIAN_PERSONAL, name: "Andreessen Horowitz Growth Fund", assetClass: "private_equity" as const, acquisitionCost: "1500000.00", currentValue: "1900000.00", valuedAt: daysAgo(60) },
    // Venture Capital (1)
    { id: ASSET_IDS[13], entityId: ENT_WELLINGTON_CORP, name: "Y Combinator W24 Batch", assetClass: "venture_capital" as const, acquisitionCost: "500000.00", currentValue: "750000.00", valuedAt: daysAgo(120) },
    // Cash (2)
    { id: ASSET_IDS[14], entityId: ENT_BLACKWOOD_PERSONAL, name: "Chase Money Market Account", assetClass: "cash" as const, acquisitionCost: "2000000.00", currentValue: "2025000.00", valuedAt: daysAgo(1) },
    { id: ASSET_IDS[15], entityId: ENT_PATTERSON_PERSONAL, name: "Fidelity Cash Management", assetClass: "cash" as const, acquisitionCost: "350000.00", currentValue: "355000.00", valuedAt: daysAgo(1) },
    // Crypto (2)
    { id: ASSET_IDS[16], entityId: ENT_CHEN_LLC, name: "Bitcoin Cold Storage", assetClass: "crypto" as const, acquisitionCost: "200000.00", currentValue: "310000.00", valuedAt: daysAgo(1), metadata: { blockchain: "bitcoin", quantity: 3.2 } },
    { id: ASSET_IDS[17], entityId: ENT_CHEN_LLC, name: "Ethereum Staking", assetClass: "crypto" as const, acquisitionCost: "100000.00", currentValue: "145000.00", valuedAt: daysAgo(1), metadata: { blockchain: "ethereum", quantity: 42.5 } },
    // Commodities (1)
    { id: ASSET_IDS[18], entityId: ENT_WELLINGTON_TRUST, name: "Gold Bullion Reserve", assetClass: "commodities" as const, acquisitionCost: "500000.00", currentValue: "620000.00", valuedAt: daysAgo(10) },
    // Collectibles (1)
    { id: ASSET_IDS[19], entityId: ENT_BLACKWOOD_TRUST, name: "Basquiat - Untitled 1982 Print", assetClass: "collectibles" as const, acquisitionCost: "800000.00", currentValue: "1100000.00", valuedAt: daysAgo(180) },
  ]
  await db.insert(schema.assets).values(assetRows as typeof schema.assets.$inferInsert[])

  // ── 7. Valuations (60 = 3 per asset, chronologically ordered) ─────────
  console.log("  Inserting valuations...")
  const valuationRows = assetRows.flatMap((asset) => {
    const current = parseFloat(asset.currentValue!)
    const cost = parseFloat(asset.acquisitionCost!)
    // 3 valuations: 6 months ago, 3 months ago, recent
    const v1 = cost + (current - cost) * 0.3
    const v2 = cost + (current - cost) * 0.7
    return [
      { assetId: asset.id, asOfDate: daysAgo(180), value: v1.toFixed(2), source: "manual", notes: "Initial valuation" },
      { assetId: asset.id, asOfDate: daysAgo(90), value: v2.toFixed(2), source: "appraisal", notes: "Mid-period review" },
      { assetId: asset.id, asOfDate: daysAgo(Math.floor(Math.random() * 30) + 1), value: current.toFixed(2), source: "market_data", notes: "Latest market value" },
    ]
  })
  await db.insert(schema.valuations).values(valuationRows)

  // ── 8. Documents (30) ─────────────────────────────────────────────────────
  console.log("  Inserting documents...")
  const docTypes = [
    { name: "Trust Agreement", mimeType: "application/pdf", folder: "legal", tags: ["trust", "legal"] },
    { name: "Operating Agreement", mimeType: "application/pdf", folder: "legal", tags: ["llc", "legal"] },
    { name: "Tax Return 2025", mimeType: "application/pdf", folder: "tax", tags: ["tax", "annual"] },
    { name: "Property Deed", mimeType: "application/pdf", folder: "real-estate", tags: ["deed", "property"] },
    { name: "Insurance Certificate", mimeType: "application/pdf", folder: "insurance", tags: ["insurance"] },
    { name: "Appraisal Report", mimeType: "application/pdf", folder: "valuations", tags: ["appraisal"] },
    { name: "KYC Verification", mimeType: "application/pdf", folder: "compliance", tags: ["kyc", "compliance"] },
    { name: "Investment Policy Statement", mimeType: "application/pdf", folder: "policy", tags: ["ips"] },
    { name: "Quarterly Performance Report", mimeType: "application/pdf", folder: "reports", tags: ["performance", "quarterly"] },
    { name: "Wire Transfer Authorization", mimeType: "application/pdf", folder: "transfers", tags: ["wire", "authorization"] },
  ]

  const documentRows = Array.from({ length: 30 }, (_, i) => {
    const doc = docTypes[i % docTypes.length]
    // Distribute across clients/entities
    const clientIds = [CLIENT_BLACKWOOD, CLIENT_WELLINGTON, CLIENT_MERIDIAN_C, CLIENT_CHEN, CLIENT_PATTERSON]
    const entityIds = [ENT_BLACKWOOD_LLC, ENT_BLACKWOOD_TRUST, ENT_WELLINGTON_TRUST, ENT_CHEN_LLC, ENT_PATTERSON_PERSONAL]
    const orgForClient = i < 18 ? ORG_1 : ORG_2
    const uploaders = [USER_SARAH, USER_MICHAEL, USER_JAMES, USER_EMILY]
    const statuses = ["verified", "verified", "verified", "pending", "expired"] as const

    return {
      id: DOC_IDS[i],
      orgId: orgForClient,
      clientId: clientIds[i % clientIds.length],
      entityId: entityIds[i % entityIds.length],
      name: `${doc.name}${i > 9 ? ` (${Math.floor(i / 10) + 1})` : ""}`,
      storagePath: `/documents/${orgForClient}/${DOC_IDS[i]}.pdf`,
      mimeType: doc.mimeType,
      sizeBytes: BigInt(Math.floor(Math.random() * 5000000) + 100000),
      folder: doc.folder,
      tags: doc.tags,
      status: statuses[i % statuses.length],
      uploadedBy: uploaders[i % uploaders.length],
      version: 1,
      expiresAt: i % 5 === 4 ? daysAgo(-30) : i % 5 === 3 ? daysAgo(90) : null,
    }
  })
  await db.insert(schema.documents).values(documentRows)

  // ── 9. Ledger Events (50) ─────────────────────────────────────────────────
  console.log("  Inserting ledger_events...")
  const ledgerActions = [
    "created", "updated", "document_uploaded", "document_verified",
    "asset_valued", "login", "report_generated", "compliance_reviewed",
    "permission_changed", "document_downloaded",
  ] as const
  const targetTypes = ["asset", "document", "client", "user", "report", "org"] as const

  const ledgerRows = Array.from({ length: 50 }, (_, i) => ({
    orgId: i < 30 ? ORG_1 : ORG_2,
    actorUserId: [USER_SARAH, USER_MICHAEL, USER_JAMES, USER_EMILY][i % 4],
    action: ledgerActions[i % ledgerActions.length],
    targetType: targetTypes[i % targetTypes.length],
    targetId: uuid(100 + (i % 20)), // reference various assets/docs
    ipAddress: `192.168.1.${(i % 254) + 1}`,
    payload: { description: `Seed event ${i + 1}`, automated: i % 3 === 0 },
    createdAt: daysAgo(50 - i), // chronological order
  }))
  await db.insert(schema.ledgerEvents).values(ledgerRows as typeof schema.ledgerEvents.$inferInsert[])

  // ── 10. Notifications (10) ────────────────────────────────────────────────
  console.log("  Inserting notifications...")
  const notifTypes = [
    "task_assigned", "document_uploaded", "document_expiring",
    "report_ready", "compliance_alert", "task_due",
    "document_requested", "system",
  ] as const

  const notificationRows = Array.from({ length: 10 }, (_, i) => ({
    userId: [USER_SARAH, USER_MICHAEL, USER_JAMES, USER_EMILY][i % 4],
    orgId: i < 6 ? ORG_1 : ORG_2,
    type: notifTypes[i % notifTypes.length],
    title: [
      "New task assigned: Review Q4 reports",
      "Document uploaded: Trust Agreement",
      "Document expiring: Insurance Certificate",
      "Report ready: Portfolio Performance Q4",
      "Compliance alert: KYC verification due",
      "Task due tomorrow: File annual report",
      "Document requested from Blackwood Capital",
      "System maintenance scheduled",
      "New compliance review required",
      "Portfolio rebalancing recommendation",
    ][i],
    message: `Notification detail for item ${i + 1}. Please review and take appropriate action.`,
    readAt: i < 4 ? daysAgo(i) : null, // first 4 are read
    createdAt: daysAgo(10 - i),
  }))
  await db.insert(schema.notifications).values(notificationRows)

  // ── 11. Compliance Controls (5) ───────────────────────────────────────────
  console.log("  Inserting compliance_controls...")
  await db.insert(schema.complianceControls).values([
    {
      id: CTRL_IDS[0],
      orgId: ORG_1,
      code: "KYC-001",
      name: "Client Identity Verification",
      description: "Verify client identity through government-issued ID and proof of address",
      framework: "AML/KYC",
      status: "implemented" as const,
      assigneeId: USER_SARAH,
      dueDate: "2026-06-30",
      category: "onboarding",
      isActive: true,
    },
    {
      id: CTRL_IDS[1],
      orgId: ORG_1,
      code: "AML-001",
      name: "Anti-Money Laundering Screening",
      description: "Screen all clients and transactions against OFAC and sanctions lists",
      framework: "AML/KYC",
      status: "verified" as const,
      assigneeId: USER_MICHAEL,
      dueDate: "2026-12-31",
      category: "monitoring",
      isActive: true,
    },
    {
      id: CTRL_IDS[2],
      orgId: ORG_1,
      code: "TAX-001",
      name: "Annual Tax Document Collection",
      description: "Collect and verify all required tax documents from clients annually",
      framework: "Tax Compliance",
      status: "in_progress" as const,
      assigneeId: USER_JAMES,
      dueDate: "2026-04-15",
      category: "annual",
      isActive: true,
    },
    {
      id: CTRL_IDS[3],
      orgId: ORG_2,
      code: "SEC-001",
      name: "Data Encryption at Rest",
      description: "Ensure all sensitive data is encrypted using AES-256 at rest",
      framework: "SEC/FINRA",
      status: "implemented" as const,
      assigneeId: USER_EMILY,
      category: "security",
      isActive: true,
    },
    {
      id: CTRL_IDS[4],
      orgId: ORG_2,
      code: "BCP-001",
      name: "Business Continuity Plan",
      description: "Maintain and test business continuity and disaster recovery plan",
      framework: "Operational",
      status: "not_started" as const,
      dueDate: "2026-09-30",
      category: "operations",
      isActive: true,
    },
  ])

  // ── 12. Compliance Evidence (3 items) ────────────────────────────────────
  console.log("  Inserting compliance_evidence...")
  await db.insert(schema.complianceEvidence).values([
    {
      controlId: CTRL_IDS[0],
      documentId: DOC_IDS[6], // KYC Verification doc
      clientId: CLIENT_BLACKWOOD,
      status: "approved",
      validFrom: daysAgo(180),
      validUntil: daysAgo(-180),
      reviewedBy: USER_SARAH,
      reviewedAt: daysAgo(175),
    },
    {
      controlId: CTRL_IDS[1],
      documentId: DOC_IDS[7], // Investment Policy Statement
      clientId: CLIENT_WELLINGTON,
      status: "approved",
      validFrom: daysAgo(90),
      validUntil: daysAgo(-270),
      reviewedBy: USER_MICHAEL,
      reviewedAt: daysAgo(85),
    },
    {
      controlId: CTRL_IDS[2],
      documentId: DOC_IDS[2], // Tax Return
      clientId: CLIENT_BLACKWOOD,
      status: "pending",
      validFrom: daysAgo(30),
    },
  ])

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log("✅ Seed complete!")
  console.log("   2 orgs, 4 users, 6 org_members, 5 clients, 10 entities")
  console.log("   20 assets, 60 valuations, 30 documents, 50 ledger_events")
  console.log("   10 notifications, 5 compliance controls, 3 evidence items")

  await pool.end()
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
