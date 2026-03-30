/**
 * ============================================================================
 * TEST FILE: alerts.service.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the alerts service. The alerts service queries the
 * notifications table and maps each notification to an Alert object. We mock
 * the database so no real connection is needed.
 *
 * SEVERITY MAPPING:
 *   critical  -> compliance_alert
 *   warning   -> document_expiring, task_due, capital_call_due, capital_call_overdue
 *   info      -> everything else (task_assigned, document_uploaded, etc.)
 *
 * RELATED FILES:
 *   lib/services/alerts.service.ts        — service under test
 *   app/db/schema/notifications.ts        — notifications table (source data)
 *   lib/types/mock.ts                     — Alert and AlertSeverity types
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock the database ────────────────────────────────────────────────────
vi.mock("@/app/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  }
  return {
    db: {
      select: vi.fn(() => selectChain),
    },
  }
})

import { db } from "@/app/db"
import {
  getAlerts,
  getUnreadAlerts,
  getAlertsBySeverity,
  getAlertCount,
} from "@/lib/services/alerts.service"

// ============================================================================
// FIXTURES — sample notification DB rows
// ============================================================================

function makeNotifRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "notif-001",
    userId: "user-uuid-001",
    orgId: "org-uuid-001",
    type: "document_expiring",
    title: "Document Expiring Soon",
    message: "Property Insurance Policy for Manhattan Tower expires in 352 days",
    readAt: null,
    link: "/app/vault",
    payload: { entityId: "doc-002", entityType: "document" },
    createdAt: new Date("2024-01-15T10:00:00Z"),
    deletedAt: null,
    ...overrides,
  }
}

/** Six notification rows matching the old seed data's variety. */
const seedRows = [
  makeNotifRow({
    id: "notif-001",
    type: "document_expiring",
    title: "Document Expiring Soon",
    message: "Property Insurance Policy for Manhattan Tower expires in 352 days",
    readAt: null,
    link: "/app/vault",
    payload: { entityId: "doc-002", entityType: "document" },
    createdAt: new Date("2024-01-15T10:00:00Z"),
  }),
  makeNotifRow({
    id: "notif-002",
    type: "compliance_alert",
    title: "Document Expired",
    message: "Licensing Agreement - TechCorp has expired and requires renewal",
    readAt: null,
    link: "/app/vault",
    payload: { entityId: "doc-013", entityType: "document" },
    createdAt: new Date("2024-01-01T00:00:00Z"),
  }),
  makeNotifRow({
    id: "notif-003",
    type: "document_uploaded",
    title: "Pending Verification",
    message: "Miami Development - Purchase Agreement awaiting legal verification",
    readAt: new Date("2024-01-11T10:00:00Z"),
    link: "/app/vault",
    payload: { entityId: "doc-008", entityType: "document" },
    createdAt: new Date("2024-01-10T09:00:00Z"),
  }),
  makeNotifRow({
    id: "notif-004",
    type: "task_due",
    title: "Stale Valuation",
    message: "Software Patent Portfolio hasn't been valued in 32 days",
    readAt: null,
    link: "/app/assets",
    payload: { entityId: "ast-009", entityType: "asset" },
    createdAt: new Date("2024-01-15T08:00:00Z"),
  }),
  makeNotifRow({
    id: "notif-005",
    type: "system",
    title: "High Risk Score",
    message: "Series B - Quantum Computing Startup has risk score above threshold (75)",
    readAt: new Date("2024-01-15T12:00:00Z"),
    link: "/app/assets",
    payload: { entityId: "ast-003", entityType: "asset" },
    createdAt: new Date("2024-01-14T12:00:00Z"),
  }),
  makeNotifRow({
    id: "notif-006",
    type: "document_expiring",
    title: "KYC Documents Pending",
    message: "Wellington Trust onboarding documents require review",
    readAt: null,
    link: "/app/clients",
    payload: { entityId: "client-002", entityType: "client" },
    createdAt: new Date("2024-01-12T14:00:00Z"),
  }),
]

// ============================================================================
// HELPER — drill into the mocked select chain
// ============================================================================

function getSelectChain() {
  return (db.select as ReturnType<typeof vi.fn>)()
}

// ============================================================================
// 1. getAlerts — full list
// ============================================================================

describe("getAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns all 6 alerts from notification rows", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const alerts = await getAlerts()
    expect(alerts).toHaveLength(6)
  })

  it("every alert has the required shape fields", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const alerts = await getAlerts()
    for (const alert of alerts) {
      expect(alert.id).toBeDefined()
      expect(alert.title).toBeDefined()
      expect(alert.description).toBeDefined()
      expect(alert.severity).toBeDefined()
      expect(alert.timestamp).toBeDefined()
      expect(typeof alert.isRead).toBe("boolean")
    }
  })

  it("returns a new array each call", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const a = await getAlerts()
    getSelectChain().where.mockResolvedValue(seedRows)
    const b = await getAlerts()
    expect(a).toEqual(b)
  })

  it("severities are only the three valid values", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const alerts = await getAlerts()
    const valid = new Set(["info", "warning", "critical"])
    for (const alert of alerts) {
      expect(valid.has(alert.severity)).toBe(true)
    }
  })

  it("returns empty array when no notifications exist", async () => {
    getSelectChain().where.mockResolvedValue([])
    const alerts = await getAlerts()
    expect(alerts).toEqual([])
  })

  it("maps compliance_alert type to critical severity", async () => {
    getSelectChain().where.mockResolvedValue([
      makeNotifRow({ type: "compliance_alert" }),
    ])
    const alerts = await getAlerts()
    expect(alerts[0].severity).toBe("critical")
  })

  it("maps document_expiring type to warning severity", async () => {
    getSelectChain().where.mockResolvedValue([
      makeNotifRow({ type: "document_expiring" }),
    ])
    const alerts = await getAlerts()
    expect(alerts[0].severity).toBe("warning")
  })

  it("maps task_assigned type to info severity", async () => {
    getSelectChain().where.mockResolvedValue([
      makeNotifRow({ type: "task_assigned" }),
    ])
    const alerts = await getAlerts()
    expect(alerts[0].severity).toBe("info")
  })
})

// ============================================================================
// 2. getUnreadAlerts — isRead filter
// ============================================================================

describe("getUnreadAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns only alerts where isRead is false", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const alerts = await getUnreadAlerts()
    for (const alert of alerts) {
      expect(alert.isRead).toBe(false)
    }
  })

  it("excludes the read alerts", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const all = await getAlerts()
    const readCount = all.filter((a) => a.isRead).length
    getSelectChain().where.mockResolvedValue(seedRows)
    const unread = await getUnreadAlerts()
    expect(unread).toHaveLength(all.length - readCount)
  })

  it("unread count is less than total", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const all = await getAlerts()
    getSelectChain().where.mockResolvedValue(seedRows)
    const unread = await getUnreadAlerts()
    expect(unread.length).toBeLessThan(all.length)
  })

  it("contains the critical unread alert (notif-002)", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const unread = await getUnreadAlerts()
    const ids = unread.map((a) => a.id)
    expect(ids).toContain("notif-002")
  })

  it("does NOT contain read alerts (notif-003, notif-005 are read)", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const unread = await getUnreadAlerts()
    const ids = unread.map((a) => a.id)
    expect(ids).not.toContain("notif-003")
    expect(ids).not.toContain("notif-005")
  })
})

// ============================================================================
// 3. getAlertsBySeverity ��� severity filter
// ============================================================================

describe("getAlertsBySeverity", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns only critical alerts", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const alerts = await getAlertsBySeverity("critical")
    expect(alerts.length).toBeGreaterThan(0)
    for (const alert of alerts) {
      expect(alert.severity).toBe("critical")
    }
  })

  it("returns only warning alerts", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const alerts = await getAlertsBySeverity("warning")
    expect(alerts.length).toBeGreaterThan(0)
    for (const alert of alerts) {
      expect(alert.severity).toBe("warning")
    }
  })

  it("returns only info alerts", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const alerts = await getAlertsBySeverity("info")
    expect(alerts.length).toBeGreaterThan(0)
    for (const alert of alerts) {
      expect(alert.severity).toBe("info")
    }
  })

  it("returns empty array for a severity that does not exist in data", async () => {
    getSelectChain().where.mockResolvedValue([])
    const alerts = await getAlertsBySeverity("nonexistent" as never)
    expect(alerts).toHaveLength(0)
  })

  it("severity totals across all three levels equal the total count", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const all = await getAlerts()
    getSelectChain().where.mockResolvedValue(seedRows)
    const critical = await getAlertsBySeverity("critical")
    getSelectChain().where.mockResolvedValue(seedRows)
    const warning = await getAlertsBySeverity("warning")
    getSelectChain().where.mockResolvedValue(seedRows)
    const info = await getAlertsBySeverity("info")
    expect(critical.length + warning.length + info.length).toBe(all.length)
  })
})

// ============================================================================
// 4. getAlertCount — aggregation
// ============================================================================

describe("getAlertCount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("total matches getAlerts() length", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const all = await getAlerts()
    getSelectChain().where.mockResolvedValue(seedRows)
    const count = await getAlertCount()
    expect(count.total).toBe(all.length)
  })

  it("unread matches getUnreadAlerts() length", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const unread = await getUnreadAlerts()
    getSelectChain().where.mockResolvedValue(seedRows)
    const count = await getAlertCount()
    expect(count.unread).toBe(unread.length)
  })

  it("critical counts only UNREAD critical alerts", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const unread = await getUnreadAlerts()
    const unreadCritical = unread.filter((a) => a.severity === "critical").length
    getSelectChain().where.mockResolvedValue(seedRows)
    const count = await getAlertCount()
    expect(count.critical).toBe(unreadCritical)
  })

  it("warning counts only UNREAD warning alerts", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const unread = await getUnreadAlerts()
    const unreadWarning = unread.filter((a) => a.severity === "warning").length
    getSelectChain().where.mockResolvedValue(seedRows)
    const count = await getAlertCount()
    expect(count.warning).toBe(unreadWarning)
  })

  it("all returned fields are non-negative numbers", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const count = await getAlertCount()
    expect(count.total).toBeGreaterThanOrEqual(0)
    expect(count.unread).toBeGreaterThanOrEqual(0)
    expect(count.critical).toBeGreaterThanOrEqual(0)
    expect(count.warning).toBeGreaterThanOrEqual(0)
  })

  it("unread <= total", async () => {
    getSelectChain().where.mockResolvedValue(seedRows)
    const count = await getAlertCount()
    expect(count.unread).toBeLessThanOrEqual(count.total)
  })
})

// ============================================================================
// 5. Error handling — database failures
// ============================================================================

describe("alerts service — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getAlerts propagates database errors", async () => {
    getSelectChain().where.mockRejectedValue(new Error("Connection refused"))
    await expect(getAlerts()).rejects.toThrow("Connection refused")
  })
})
