/**
 * Scheduled health-check functions.
 *
 * Each function queries the database for a specific condition
 * and returns AppAlert objects (or nothing) for the dispatcher.
 * These are called from edge functions and cron jobs.
 */

import { db } from "@/app/db"
import { integrations, assets, valuations, complianceControls } from "@/app/db/schema"
import { eq, and, lt, lte, inArray, isNull } from "drizzle-orm"
import { checkPlanUsage, type PlanTier, type UsageSnapshot } from "@/lib/stripe/plan-limits"
import type { AppAlert } from "./dispatcher"

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Check if any Plaid integration hasn't synced in 24+ hours.
 * Returns a critical alert if stale.
 */
export async function checkStalePlaidSync(orgId: string): Promise<AppAlert[]> {
  const alerts: AppAlert[] = []

  const plaidIntegrations = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      lastSyncAt: integrations.lastSyncAt,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.orgId, orgId),
        eq(integrations.provider, "plaid"),
        eq(integrations.status, "connected"),
      ),
    )

  const cutoff = new Date(Date.now() - MS_PER_DAY)

  for (const integration of plaidIntegrations) {
    if (!integration.lastSyncAt) continue
    if (new Date(integration.lastSyncAt) < cutoff) {
      const hoursAgo = Math.round(
        (Date.now() - new Date(integration.lastSyncAt).getTime()) / (60 * 60 * 1000),
      )
      alerts.push({
        title: `Plaid sync stale: ${integration.name}`,
        description: `Last synced ${hoursAgo} hours ago. Balance data may be outdated.`,
        severity: "critical",
        source: "check-stale-plaid-sync",
        orgId,
        actionUrl: "/app/settings/integrations",
      })
    }
  }

  return alerts
}

/**
 * Check plan usage and alert at 80% (warning) and 100% (critical).
 */
export function checkPlanLimitAlerts(
  orgId: string,
  plan: PlanTier,
  usage: UsageSnapshot,
): AppAlert[] {
  const alerts: AppAlert[] = []
  const statuses = checkPlanUsage(plan, usage)

  for (const status of statuses) {
    if (status.level === "exceeded") {
      alerts.push({
        title: `Plan limit exceeded: ${status.resource.replace("_", " ")}`,
        description: status.message ?? `You've exceeded your ${status.resource} limit.`,
        severity: "critical",
        source: "check-plan-limits",
        orgId,
        actionUrl: "/app/settings/billing",
      })
    } else if (status.level === "warning") {
      alerts.push({
        title: `Approaching plan limit: ${status.resource.replace("_", " ")}`,
        description: status.message ?? `You're approaching your ${status.resource} limit.`,
        severity: "warning",
        source: "check-plan-limits",
        orgId,
        actionUrl: "/app/settings/billing",
      })
    }
  }

  return alerts
}

/**
 * Check all integrations with status "error" and create one alert each.
 */
export async function checkIntegrationHealth(orgId: string): Promise<AppAlert[]> {
  const errorIntegrations = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
      statusMessage: integrations.statusMessage,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.orgId, orgId),
        eq(integrations.status, "error"),
      ),
    )

  return errorIntegrations.map((integration) => ({
    title: `Integration error: ${integration.name}`,
    description: integration.statusMessage ?? `${integration.provider} integration has an error.`,
    severity: "warning" as const,
    source: "check-integration-health",
    orgId,
    actionUrl: "/app/settings/integrations",
  }))
}

/**
 * Check for assets not valued in 90+ days.
 */
export async function checkStaleValuations(orgId: string): Promise<AppAlert[]> {
  const alerts: AppAlert[] = []
  const cutoff = new Date(Date.now() - 90 * MS_PER_DAY)

  // Get active assets for this org through entities
  const staleAssets = await db.query.assets.findMany({
    where: and(
      eq(assets.status, "active"),
      lt(assets.valuedAt, cutoff),
    ),
    with: {
      entity: {
        with: {
          client: {
            columns: { orgId: true },
          },
        },
      },
    },
  })

  for (const asset of staleAssets) {
    if (asset.entity?.client?.orgId !== orgId) continue

    const daysSince = asset.valuedAt
      ? Math.round((Date.now() - new Date(asset.valuedAt).getTime()) / MS_PER_DAY)
      : null

    if (daysSince === null) continue

    alerts.push({
      title: `Stale valuation: ${asset.name}`,
      description: `Last valued ${daysSince} days ago. Consider updating.`,
      severity: "warning",
      source: "check-stale-valuations",
      orgId,
      actionUrl: `/app/assets/${asset.id}`,
    })
  }

  return alerts
}

/**
 * Check for compliance controls due within 7 days.
 */
export async function checkComplianceDeadlines(orgId: string): Promise<AppAlert[]> {
  const alerts: AppAlert[] = []
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * MS_PER_DAY)

  const upcomingControls = await db
    .select({
      id: complianceControls.id,
      name: complianceControls.name,
      code: complianceControls.code,
      dueDate: complianceControls.dueDate,
    })
    .from(complianceControls)
    .where(
      and(
        eq(complianceControls.orgId, orgId),
        inArray(complianceControls.status, ["not_started", "in_progress"]),
        eq(complianceControls.isActive, true),
        lte(complianceControls.dueDate, in7Days.toISOString()),
      ),
    )

  for (const control of upcomingControls) {
    if (!control.dueDate) continue
    const daysUntil = Math.ceil(
      (new Date(control.dueDate).getTime() - now.getTime()) / MS_PER_DAY,
    )

    alerts.push({
      title: `Compliance deadline: ${control.code} — ${control.name}`,
      description:
        daysUntil < 0
          ? `${Math.abs(daysUntil)} days overdue`
          : daysUntil === 0
            ? "Due today"
            : `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      severity: "warning",
      source: "check-compliance-deadlines",
      orgId,
      actionUrl: `/app/compliance/${control.id}`,
    })
  }

  return alerts
}
