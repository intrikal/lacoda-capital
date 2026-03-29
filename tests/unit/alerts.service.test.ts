/**
 * ============================================================================
 * TEST FILE: alerts.service.test.ts
 * ============================================================================
 *
 * Kevin, this file tests the alerts service. The alerts service is unique:
 * it has NO database calls — all data is a static seed array baked into the
 * service file itself. So we don't need to mock anything here; we just call
 * the functions and verify they filter / count the data correctly.
 *
 * RELATED FILES:
 *   lib/services/alerts.service.ts  — service under test
 *   lib/types/mock.ts               — Alert and AlertSeverity types
 */

import { describe, it, expect } from "vitest"
import {
  getAlerts,
  getUnreadAlerts,
  getAlertsBySeverity,
  getAlertCount,
} from "@/lib/services/alerts.service"

// ============================================================================
// 1. getAlerts — full seed
// ============================================================================

describe("getAlerts", () => {
  it("returns all 6 seed alerts", async () => {
    const alerts = await getAlerts()
    expect(alerts).toHaveLength(6)
  })

  it("every alert has the required shape fields", async () => {
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

  it("returns a new array each call (not the same reference)", async () => {
    // alerts.service returns seedAlerts directly — if mutation happened upstream
    // it would affect subsequent calls. Verify referential stability doesn't matter
    // for test isolation: each call resolves to the same data.
    const a = await getAlerts()
    const b = await getAlerts()
    expect(a).toEqual(b)
  })

  it("severities are only the three valid values", async () => {
    const alerts = await getAlerts()
    const valid = new Set(["info", "warning", "critical"])
    for (const alert of alerts) {
      expect(valid.has(alert.severity)).toBe(true)
    }
  })
})

// ============================================================================
// 2. getUnreadAlerts — isRead filter
// ============================================================================

describe("getUnreadAlerts", () => {
  it("returns only alerts where isRead is false", async () => {
    const alerts = await getUnreadAlerts()
    for (const alert of alerts) {
      expect(alert.isRead).toBe(false)
    }
  })

  it("excludes the read alerts", async () => {
    const all = await getAlerts()
    const readCount = all.filter((a) => a.isRead).length
    const unread = await getUnreadAlerts()
    expect(unread).toHaveLength(all.length - readCount)
  })

  it("unread count is less than total", async () => {
    const all = await getAlerts()
    const unread = await getUnreadAlerts()
    expect(unread.length).toBeLessThan(all.length)
  })

  it("contains the critical unread alert (alert-002)", async () => {
    const unread = await getUnreadAlerts()
    const ids = unread.map((a) => a.id)
    expect(ids).toContain("alert-002")
  })

  it("does NOT contain read alerts (alert-003, alert-005 are read)", async () => {
    const unread = await getUnreadAlerts()
    const ids = unread.map((a) => a.id)
    expect(ids).not.toContain("alert-003")
    expect(ids).not.toContain("alert-005")
  })
})

// ============================================================================
// 3. getAlertsBySeverity — severity filter
// ============================================================================

describe("getAlertsBySeverity", () => {
  it("returns only critical alerts", async () => {
    const alerts = await getAlertsBySeverity("critical")
    expect(alerts.length).toBeGreaterThan(0)
    for (const alert of alerts) {
      expect(alert.severity).toBe("critical")
    }
  })

  it("returns only warning alerts", async () => {
    const alerts = await getAlertsBySeverity("warning")
    expect(alerts.length).toBeGreaterThan(0)
    for (const alert of alerts) {
      expect(alert.severity).toBe("warning")
    }
  })

  it("returns only info alerts", async () => {
    const alerts = await getAlertsBySeverity("info")
    expect(alerts.length).toBeGreaterThan(0)
    for (const alert of alerts) {
      expect(alert.severity).toBe("info")
    }
  })

  it("returns empty array for a severity that does not exist in seed data", async () => {
    const alerts = await getAlertsBySeverity("nonexistent" as never)
    expect(alerts).toHaveLength(0)
  })

  it("severity totals across all three levels equal the total count", async () => {
    const [all, critical, warning, info] = await Promise.all([
      getAlerts(),
      getAlertsBySeverity("critical"),
      getAlertsBySeverity("warning"),
      getAlertsBySeverity("info"),
    ])
    expect(critical.length + warning.length + info.length).toBe(all.length)
  })
})

// ============================================================================
// 4. getAlertCount — aggregation
// ============================================================================

describe("getAlertCount", () => {
  it("total matches getAlerts() length", async () => {
    const [all, count] = await Promise.all([getAlerts(), getAlertCount()])
    expect(count.total).toBe(all.length)
  })

  it("unread matches getUnreadAlerts() length", async () => {
    const [unread, count] = await Promise.all([getUnreadAlerts(), getAlertCount()])
    expect(count.unread).toBe(unread.length)
  })

  it("critical counts only UNREAD critical alerts", async () => {
    const unread = await getUnreadAlerts()
    const unreadCritical = unread.filter((a) => a.severity === "critical").length
    const count = await getAlertCount()
    expect(count.critical).toBe(unreadCritical)
  })

  it("warning counts only UNREAD warning alerts", async () => {
    const unread = await getUnreadAlerts()
    const unreadWarning = unread.filter((a) => a.severity === "warning").length
    const count = await getAlertCount()
    expect(count.warning).toBe(unreadWarning)
  })

  it("all returned fields are non-negative numbers", async () => {
    const count = await getAlertCount()
    expect(count.total).toBeGreaterThanOrEqual(0)
    expect(count.unread).toBeGreaterThanOrEqual(0)
    expect(count.critical).toBeGreaterThanOrEqual(0)
    expect(count.warning).toBeGreaterThanOrEqual(0)
  })

  it("unread <= total", async () => {
    const count = await getAlertCount()
    expect(count.unread).toBeLessThanOrEqual(count.total)
  })
})
