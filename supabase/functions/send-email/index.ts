/**
 * send-email — Supabase Edge Function
 *
 * Kevin, this is an Edge Function that runs on Supabase's servers.
 * It's called by other Edge Functions (check-expirations, weekly-digest)
 * or directly from our Next.js app to send transactional emails via Resend.
 *
 * WHY AN EDGE FUNCTION?
 *   - We can't send emails directly from the browser (security risk)
 *   - Edge Functions run on the server, close to the user, and are fast
 *   - They can hold API keys securely (Resend API key lives in env vars)
 *
 * EMAIL TYPES:
 *   1. "expiration_reminder" — Document is expiring soon (7 days, 1 day, or already expired)
 *   2. "team_invite"         — Someone was invited to join an org
 *   3. "weekly_digest"       — Summary of new assets, valuations, upcoming deadlines
 */

// Deno is the runtime for Supabase Edge Functions (similar to Node.js but different)
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const FROM_EMAIL = "Lacoda Capital <notifications@lacoda.capital>"

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailRequest {
  type: "expiration_reminder" | "team_invite" | "weekly_digest" | "document_request_email" | "smart_alert_digest" | "operational_alert"
  to: string
  data: Record<string, unknown>
}

interface ExpirationData {
  userName: string
  documents: {
    name: string
    assetName: string
    expiresAt: string
    daysUntilExpiry: number
  }[]
  orgName: string
}

interface InviteData {
  inviterName: string
  orgName: string
  role: string
  magicLink: string
}

interface DigestData {
  userName: string
  orgName: string
  period: string
  newAssets: { name: string; assetClass: string; value: number }[]
  newValuations: { assetName: string; value: number; change: number }[]
  upcomingDeadlines: { title: string; dueDate: string; type: string }[]
}

// ─── Email Templates ────────────────────────────────────────────────────────

function buildExpirationEmail(data: ExpirationData): { subject: string; html: string } {
  const count = data.documents.length
  const subject =
    count === 1
      ? `Document "${data.documents[0].name}" is expiring soon`
      : `${count} documents need attention — ${data.orgName}`

  const rows = data.documents
    .map(
      (doc) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #27272a;">
          <strong style="color: #f4f4f5;">${doc.name}</strong>
          <br><span style="color: #a1a1aa; font-size: 13px;">Linked to: ${doc.assetName}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; text-align: right;">
          <span style="color: ${doc.daysUntilExpiry <= 0 ? "#ef4444" : doc.daysUntilExpiry <= 1 ? "#f59e0b" : "#22d3ee"}; font-weight: 600;">
            ${doc.daysUntilExpiry <= 0 ? "EXPIRED" : doc.daysUntilExpiry === 1 ? "Expires tomorrow" : `${doc.daysUntilExpiry} days left`}
          </span>
          <br><span style="color: #a1a1aa; font-size: 13px;">${doc.expiresAt}</span>
        </td>
      </tr>`
    )
    .join("")

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #22d3ee; font-size: 20px; margin: 0;">Lacoda Capital</h1>
        </div>
        <div style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a; padding: 32px;">
          <h2 style="color: #f4f4f5; font-size: 18px; margin: 0 0 8px 0;">Document Expiration Alert</h2>
          <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px 0;">
            Hi ${data.userName}, the following documents in ${data.orgName} need your attention:
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            ${rows}
          </table>
          <div style="margin-top: 24px; text-align: center;">
            <a href="https://app.lacoda.capital/app/vault" style="display: inline-block; padding: 10px 24px; background-color: #0891b2; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
              View in Vault
            </a>
          </div>
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          You're receiving this because you have expiration alerts enabled.
          <a href="https://app.lacoda.capital/app/settings" style="color: #0891b2;">Manage preferences</a>
        </p>
      </div>
    </body>
    </html>`

  return { subject, html }
}

function buildInviteEmail(data: InviteData): { subject: string; html: string } {
  const subject = `${data.inviterName} invited you to ${data.orgName}`
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #22d3ee; font-size: 20px; margin: 0;">Lacoda Capital</h1>
        </div>
        <div style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a; padding: 32px; text-align: center;">
          <h2 style="color: #f4f4f5; font-size: 22px; margin: 0 0 8px 0;">You're Invited</h2>
          <p style="color: #a1a1aa; font-size: 15px; margin: 0 0 24px 0;">
            <strong style="color: #f4f4f5;">${data.inviterName}</strong> has invited you to join
            <strong style="color: #f4f4f5;">${data.orgName}</strong> as a <strong style="color: #22d3ee;">${data.role}</strong>.
          </p>
          <a href="${data.magicLink}" style="display: inline-block; padding: 12px 32px; background-color: #0891b2; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
          <p style="color: #52525b; font-size: 13px; margin-top: 16px;">
            This link expires in 7 days. If the button doesn't work, copy and paste this URL:<br>
            <span style="color: #a1a1aa; word-break: break-all;">${data.magicLink}</span>
          </p>
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>`

  return { subject, html }
}

function buildDigestEmail(data: DigestData): { subject: string; html: string } {
  const subject = `Weekly Digest — ${data.orgName} — ${data.period}`

  const assetRows = data.newAssets.length > 0
    ? data.newAssets
        .map(
          (a) => `<li style="color: #d4d4d8; padding: 4px 0;">
            <strong>${a.name}</strong> (${a.assetClass}) — $${a.value.toLocaleString()}
          </li>`
        )
        .join("")
    : '<li style="color: #71717a;">No new assets this week</li>'

  const valuationRows = data.newValuations.length > 0
    ? data.newValuations
        .map(
          (v) => `<li style="color: #d4d4d8; padding: 4px 0;">
            ${v.assetName}: $${v.value.toLocaleString()}
            <span style="color: ${v.change >= 0 ? "#22c55e" : "#ef4444"};">
              (${v.change >= 0 ? "+" : ""}${v.change.toFixed(1)}%)
            </span>
          </li>`
        )
        .join("")
    : '<li style="color: #71717a;">No new valuations this week</li>'

  const deadlineRows = data.upcomingDeadlines.length > 0
    ? data.upcomingDeadlines
        .map(
          (d) => `<li style="color: #d4d4d8; padding: 4px 0;">
            <strong>${d.title}</strong> — ${d.type} due ${d.dueDate}
          </li>`
        )
        .join("")
    : '<li style="color: #71717a;">No upcoming deadlines</li>'

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #22d3ee; font-size: 20px; margin: 0;">Lacoda Capital</h1>
        </div>
        <div style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a; padding: 32px;">
          <h2 style="color: #f4f4f5; font-size: 18px; margin: 0 0 4px 0;">Weekly Digest</h2>
          <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px 0;">
            Hi ${data.userName}, here's what happened in ${data.orgName} this week.
          </p>

          <h3 style="color: #22d3ee; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">New Assets</h3>
          <ul style="margin: 0 0 20px 0; padding-left: 20px;">${assetRows}</ul>

          <h3 style="color: #22d3ee; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Valuations</h3>
          <ul style="margin: 0 0 20px 0; padding-left: 20px;">${valuationRows}</ul>

          <h3 style="color: #22d3ee; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Upcoming Deadlines</h3>
          <ul style="margin: 0 0 20px 0; padding-left: 20px;">${deadlineRows}</ul>

          <div style="margin-top: 24px; text-align: center;">
            <a href="https://app.lacoda.capital/app" style="display: inline-block; padding: 10px 24px; background-color: #0891b2; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Open Dashboard
            </a>
          </div>
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          You're receiving this weekly digest.
          <a href="https://app.lacoda.capital/app/settings" style="color: #0891b2;">Change frequency or unsubscribe</a>
        </p>
      </div>
    </body>
    </html>`

  return { subject, html }
}

// ─── Document Request Email Template ────────────────────────────────────────

interface DocumentRequestEmailData {
  subject: string
  body: string
}

function buildDocumentRequestEmail(data: DocumentRequestEmailData): { subject: string; html: string } {
  const bodyHtml = data.body
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br>" : `<p style="color: #d4d4d8; font-size: 15px; margin: 0 0 8px 0;">${line}</p>`))
    .join("")

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #22d3ee; font-size: 20px; margin: 0;">Lacoda Capital</h1>
        </div>
        <div style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a; padding: 32px;">
          ${bodyHtml}
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          This is an automated message from Lacoda Capital.
        </p>
      </div>
    </body>
    </html>`

  return { subject: data.subject, html }
}

// ─── Smart Alert Digest Email Template ──────────────────────────────────────

interface SmartAlertDigestData {
  userName: string
  orgName: string
  executiveSummary: string
  criticalCount: number
  totalItems: number
  alertRows: string
}

function buildSmartAlertDigestEmail(data: SmartAlertDigestData): { subject: string; html: string } {
  const subject = data.criticalCount > 0
    ? `🔴 ${data.criticalCount} critical alert${data.criticalCount === 1 ? "" : "s"} — ${data.orgName}`
    : `Weekly Alert Digest — ${data.orgName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #22d3ee; font-size: 20px; margin: 0;">Lacoda Capital</h1>
        </div>
        <div style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a; padding: 32px;">
          <h2 style="color: #f4f4f5; font-size: 18px; margin: 0 0 4px 0;">Smart Alert Digest</h2>
          <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 16px 0;">
            Hi ${data.userName}, here's your AI-prioritized alert summary for ${data.orgName}.
          </p>

          <div style="background-color: #27272a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #f4f4f5; font-size: 14px; margin: 0; font-style: italic;">
              "${data.executiveSummary}"
            </p>
            <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
              ${data.totalItems} total items · ${data.criticalCount} critical
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            ${data.alertRows}
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="https://app.lacoda.capital/app" style="display: inline-block; padding: 10px 24px; background-color: #0891b2; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
              View Dashboard
            </a>
          </div>
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          AI-powered alert digest.
          <a href="https://app.lacoda.capital/app/settings" style="color: #0891b2;">Manage preferences</a>
        </p>
      </div>
    </body>
    </html>`

  return { subject, html }
}

// ─── Operational Alert Email Template ───────────────────────────────────────

interface OperationalAlertData {
  title: string
  description: string
  severity: "critical" | "warning" | "info"
  source: string
  actionUrl?: string
}

function buildOperationalAlertEmail(data: OperationalAlertData): { subject: string; html: string } {
  const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
    critical: { label: "CRITICAL", color: "#ef4444", bg: "#3b1113" },
    warning: { label: "WARNING", color: "#f59e0b", bg: "#3b2f0e" },
    info: { label: "INFO", color: "#3b82f6", bg: "#0e1f3b" },
  }

  const config = severityConfig[data.severity] ?? severityConfig.info

  const subject = data.severity === "critical"
    ? `🔴 CRITICAL: ${data.title}`
    : data.severity === "warning"
    ? `⚠️ ${data.title}`
    : `ℹ️ ${data.title}`

  const actionButton = data.actionUrl
    ? `<div style="margin-top: 24px; text-align: center;">
        <a href="${data.actionUrl}" style="display: inline-block; padding: 10px 24px; background-color: #0891b2; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
          View Details
        </a>
      </div>`
    : ""

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #22d3ee; font-size: 20px; margin: 0;">Lacoda Capital</h1>
        </div>
        <div style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a; padding: 32px;">
          <div style="display: inline-block; padding: 4px 12px; border-radius: 4px; background-color: ${config.bg}; border: 1px solid ${config.color}; margin-bottom: 16px;">
            <span style="color: ${config.color}; font-weight: 700; font-size: 12px; letter-spacing: 1px;">${config.label}</span>
          </div>
          <h2 style="color: #f4f4f5; font-size: 18px; margin: 0 0 12px 0;">${data.title}</h2>
          <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
            ${data.description}
          </p>
          <div style="background-color: #27272a; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px;">
            <span style="color: #71717a; font-size: 12px;">Source:</span>
            <span style="color: #d4d4d8; font-size: 13px; margin-left: 4px;">${data.source}</span>
          </div>
          ${actionButton}
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          Operational alert from Lacoda Capital.
          <a href="https://app.lacoda.capital/app/settings" style="color: #0891b2;">Manage preferences</a>
        </p>
      </div>
    </body>
    </html>`

  return { subject, html }
}

// ─── Send via Resend API with retry ─────────────────────────────────────────

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  retries = 3
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
      })

      if (res.ok) return { success: true }

      const body = await res.text()
      if (res.status >= 500 && attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
        continue
      }
      return { success: false, error: `Resend ${res.status}: ${body}` }
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
        continue
      }
      return { success: false, error: String(err) }
    }
  }
  return { success: false, error: "Max retries exceeded" }
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const body: EmailRequest = await req.json()
    const { type, to, data } = body

    if (!to || !type) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'type'" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    let subject: string
    let html: string

    switch (type) {
      case "expiration_reminder": {
        const result = buildExpirationEmail(data as unknown as ExpirationData)
        subject = result.subject
        html = result.html
        break
      }
      case "team_invite": {
        const result = buildInviteEmail(data as unknown as InviteData)
        subject = result.subject
        html = result.html
        break
      }
      case "weekly_digest": {
        const result = buildDigestEmail(data as unknown as DigestData)
        subject = result.subject
        html = result.html
        break
      }
      case "document_request_email": {
        const result = buildDocumentRequestEmail(data as unknown as DocumentRequestEmailData)
        subject = result.subject
        html = result.html
        break
      }
      case "smart_alert_digest": {
        const result = buildSmartAlertDigestEmail(data as unknown as SmartAlertDigestData)
        subject = result.subject
        html = result.html
        break
      }
      case "operational_alert": {
        const result = buildOperationalAlertEmail(data as unknown as OperationalAlertData)
        subject = result.subject
        html = result.html
        break
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
    }

    const result = await sendViaResend(to, subject, html)

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 502,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
