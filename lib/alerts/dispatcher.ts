/**
 * Central alert dispatcher.
 *
 * Routes alerts to the appropriate channels based on severity:
 *   - Critical → Discord + email + in-app notification (all org admins)
 *   - Warning  → email + in-app notification
 *   - Info     → Discord only
 *
 * NEVER THROWS — all errors are caught and logged.
 */

import { sendDiscordAlert } from "./discord"
import { sendAlertEmail } from "./email"
import { db } from "@/app/db"
import { notifications, orgMembers } from "@/app/db/schema"
import { eq, and, inArray } from "drizzle-orm"

export interface AppAlert {
  title: string
  description: string
  severity: "critical" | "warning" | "info"
  source: string
  orgId?: string
  userId?: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}

/**
 * Dispatch an alert to the appropriate channels based on severity.
 *
 * Config from env:
 *   - DISCORD_WEBHOOK_URL: Discord webhook endpoint
 *   - ALERT_EMAIL_RECIPIENTS: Comma-separated email addresses
 */
export async function dispatchAlert(alert: AppAlert): Promise<void> {
  const discordUrl = process.env.DISCORD_WEBHOOK_URL
  const emailRecipientsCsv = process.env.ALERT_EMAIL_RECIPIENTS
  const emailRecipients = emailRecipientsCsv
    ? emailRecipientsCsv.split(",").map((e) => e.trim()).filter(Boolean)
    : []

  try {
    switch (alert.severity) {
      case "critical":
        await Promise.allSettled([
          sendDiscordSafe(discordUrl, alert),
          sendEmailSafe(emailRecipients, alert),
          createInAppNotifications(alert),
        ])
        break

      case "warning":
        await Promise.allSettled([
          sendEmailSafe(emailRecipients, alert),
          createInAppNotifications(alert),
        ])
        break

      case "info":
        await sendDiscordSafe(discordUrl, alert)
        break
    }
  } catch (err) {
    console.error("[alert-dispatcher] Unexpected error:", err)
  }
}

async function sendDiscordSafe(
  webhookUrl: string | undefined,
  alert: AppAlert,
): Promise<void> {
  try {
    const result = await sendDiscordAlert(webhookUrl, {
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      source: alert.source,
      actionUrl: alert.actionUrl,
    })
    if (!result.success) {
      console.error("[alert-dispatcher] Discord failed:", result.error)
    }
  } catch (err) {
    console.error("[alert-dispatcher] Discord error:", err)
  }
}

async function sendEmailSafe(
  recipients: string[],
  alert: AppAlert,
): Promise<void> {
  if (recipients.length === 0) return
  try {
    const result = await sendAlertEmail(recipients, {
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      source: alert.source,
      actionUrl: alert.actionUrl,
    })
    if (!result.success) {
      console.error("[alert-dispatcher] Email errors:", result.errors)
    }
  } catch (err) {
    console.error("[alert-dispatcher] Email error:", err)
  }
}

/**
 * Create in-app notifications for all admins/assistants in the org.
 * Only runs if alert.orgId is provided.
 */
async function createInAppNotifications(alert: AppAlert): Promise<void> {
  if (!alert.orgId) return

  try {
    const members = await db
      .select({ userId: orgMembers.userId })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, alert.orgId),
          inArray(orgMembers.role, ["admin", "assistant"]),
        ),
      )

    if (members.length === 0) return

    const notificationRows = members.map((m) => ({
      userId: m.userId,
      orgId: alert.orgId!,
      type: "system" as const,
      title: alert.title,
      message: alert.description,
      link: alert.actionUrl ?? null,
      payload: {
        href: alert.actionUrl,
        metadata: {
          severity: alert.severity,
          source: alert.source,
          ...(alert.metadata ?? {}),
        },
      },
    }))

    await db.insert(notifications).values(notificationRows)
  } catch (err) {
    console.error("[alert-dispatcher] In-app notification error:", err)
  }
}
