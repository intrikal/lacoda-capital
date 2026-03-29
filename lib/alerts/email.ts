/**
 * Email alert sender.
 *
 * Sends operational alerts via the Supabase send-email Edge Function.
 * Uses the "operational_alert" email type with a dark-themed template
 * that includes severity badge, description, and action button.
 */

export interface EmailAlert {
  title: string
  description: string
  severity: "critical" | "warning" | "info"
  source: string
  actionUrl?: string
}

/**
 * Send an alert email to one or more recipients.
 *
 * recipients is a string[] (typically from ALERT_EMAIL_RECIPIENTS env var, comma-split).
 * Calls the Supabase send-email Edge Function with type "operational_alert".
 *
 * Never throws — returns success/failure for each recipient.
 */
export async function sendAlertEmail(
  recipients: string[],
  alert: EmailAlert,
): Promise<{ success: boolean; errors: string[] }> {
  if (recipients.length === 0) {
    return { success: true, errors: [] }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return {
      success: false,
      errors: ["Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"],
    }
  }

  const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`
  const errors: string[] = []

  for (const to of recipients) {
    try {
      const res = await fetch(sendEmailUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "operational_alert",
          to: to.trim(),
          data: {
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            source: alert.source,
            actionUrl: alert.actionUrl,
          },
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => "")
        errors.push(`Failed to send to ${to}: ${res.status} ${body}`)
      }
    } catch (err) {
      errors.push(`Failed to send to ${to}: ${String(err)}`)
    }
  }

  return { success: errors.length === 0, errors }
}
