/**
 * Discord webhook alert sender.
 *
 * Sends formatted embed messages to a Discord channel via webhook URL.
 * Color-coded by severity: red (critical), amber (warning), blue (info).
 * Retries with exponential backoff on transient failures.
 */

export interface DiscordAlert {
  title: string
  description: string
  severity: "critical" | "warning" | "info"
  source: string
  timestamp?: string
  actionUrl?: string
}

const SEVERITY_COLORS: Record<DiscordAlert["severity"], number> = {
  critical: 0xef4444, // red
  warning: 0xf59e0b, // amber
  info: 0x3b82f6, // blue
}

const MAX_DESCRIPTION_LENGTH = 2000

/**
 * Send an alert to a Discord channel via webhook.
 *
 * No-ops silently if webhookUrl is empty/undefined.
 * Never throws — logs errors and returns.
 */
export async function sendDiscordAlert(
  webhookUrl: string | undefined,
  alert: DiscordAlert,
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    return { success: true }
  }

  const truncatedDescription =
    alert.description.length > MAX_DESCRIPTION_LENGTH
      ? alert.description.slice(0, MAX_DESCRIPTION_LENGTH - 3) + "..."
      : alert.description

  // Escape Discord markdown special characters in title
  const escapedTitle = escapeDiscordMarkdown(alert.title)

  const embed = {
    title: escapedTitle,
    description: truncatedDescription,
    color: SEVERITY_COLORS[alert.severity],
    fields: [
      { name: "Severity", value: alert.severity.toUpperCase(), inline: true },
      { name: "Source", value: alert.source, inline: true },
    ],
    footer: { text: "Lacoda Capital Alerts" },
    timestamp: alert.timestamp ?? new Date().toISOString(),
  }

  if (alert.actionUrl) {
    embed.fields.push({ name: "Action", value: alert.actionUrl, inline: false })
  }

  const payload = { embeds: [embed] }

  return sendWithRetry(webhookUrl, payload, 3)
}

function escapeDiscordMarkdown(text: string): string {
  return text.replace(/([*_~`|\\])/g, "\\$1")
}

async function sendWithRetry(
  webhookUrl: string,
  payload: unknown,
  maxRetries: number,
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok || res.status === 204) {
        return { success: true }
      }

      // Rate limited — respect Retry-After header
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After")
        const waitMs = retryAfter
          ? parseFloat(retryAfter) * 1000
          : 1000 * Math.pow(2, attempt - 1)

        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, waitMs))
          continue
        }
        return { success: false, error: `Discord rate limited after ${maxRetries} attempts` }
      }

      // 5xx — transient, retry
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
        continue
      }

      const body = await res.text().catch(() => "")
      return { success: false, error: `Discord ${res.status}: ${body}` }
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
        continue
      }
      return { success: false, error: String(err) }
    }
  }
  return { success: false, error: "Max retries exceeded" }
}
