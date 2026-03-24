import { describe, it, expect } from "vitest"

/**
 * Notification creation logic for compliance.deadline.approaching events.
 * Tests the logic that identifies controls approaching their due date.
 */

interface ComplianceControl {
  id: string
  code: string
  status: string
  isActive: boolean
  dueDate: string | null
  assigneeId: string | null
}

interface ComplianceNotification {
  type: "compliance.deadline.approaching"
  controlId: string
  controlCode: string
  daysUntilDue: number
  assigneeId: string | null
}

function identifyApproachingDeadlines(
  controls: ComplianceControl[],
  now: Date,
  thresholdDays: number = 7
): ComplianceNotification[] {
  return controls
    .filter((c) => {
      if (!c.isActive) return false
      if (c.status === "verified") return false
      if (!c.dueDate) return false

      const due = new Date(c.dueDate)
      const diffMs = due.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      return diffDays >= 0 && diffDays <= thresholdDays
    })
    .map((c) => {
      const due = new Date(c.dueDate!)
      const diffMs = due.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      return {
        type: "compliance.deadline.approaching" as const,
        controlId: c.id,
        controlCode: c.code,
        daysUntilDue: diffDays,
        assigneeId: c.assigneeId,
      }
    })
}

describe("compliance deadline notification logic", () => {
  const now = new Date("2026-03-23T12:00:00Z")

  it("identifies controls due within 7 days", () => {
    const controls: ComplianceControl[] = [
      { id: "1", code: "KYC-001", status: "in_progress", isActive: true, dueDate: "2026-03-25", assigneeId: "user-1" },
      { id: "2", code: "AML-001", status: "not_started", isActive: true, dueDate: "2026-04-15", assigneeId: "user-2" },
    ]

    const notifications = identifyApproachingDeadlines(controls, now)
    expect(notifications).toHaveLength(1)
    expect(notifications[0].controlCode).toBe("KYC-001")
    expect(notifications[0].daysUntilDue).toBe(2)
  })

  it("excludes verified controls", () => {
    const controls: ComplianceControl[] = [
      { id: "1", code: "KYC-001", status: "verified", isActive: true, dueDate: "2026-03-25", assigneeId: "user-1" },
    ]
    expect(identifyApproachingDeadlines(controls, now)).toHaveLength(0)
  })

  it("excludes inactive controls", () => {
    const controls: ComplianceControl[] = [
      { id: "1", code: "KYC-001", status: "in_progress", isActive: false, dueDate: "2026-03-25", assigneeId: "user-1" },
    ]
    expect(identifyApproachingDeadlines(controls, now)).toHaveLength(0)
  })

  it("excludes controls without a due date", () => {
    const controls: ComplianceControl[] = [
      { id: "1", code: "KYC-001", status: "in_progress", isActive: true, dueDate: null, assigneeId: "user-1" },
    ]
    expect(identifyApproachingDeadlines(controls, now)).toHaveLength(0)
  })

  it("excludes already-overdue controls (negative days)", () => {
    const controls: ComplianceControl[] = [
      { id: "1", code: "KYC-001", status: "in_progress", isActive: true, dueDate: "2026-03-20", assigneeId: "user-1" },
    ]
    expect(identifyApproachingDeadlines(controls, now)).toHaveLength(0)
  })

  it("includes control due today (0 days)", () => {
    const controls: ComplianceControl[] = [
      { id: "1", code: "KYC-001", status: "in_progress", isActive: true, dueDate: "2026-03-24", assigneeId: "user-1" },
    ]
    const notifications = identifyApproachingDeadlines(controls, now)
    expect(notifications).toHaveLength(1)
    expect(notifications[0].daysUntilDue).toBe(1)
  })
})
