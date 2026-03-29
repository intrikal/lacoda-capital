# Operational Alerts Setup Guide

Lacoda Capital's alerting system routes operational alerts to Discord, email, and in-app notifications based on severity. It covers integration failures, plan limits, compliance deadlines, stale data, and webhook errors.

---

## 1. How Severity Routing Works

| Severity | Discord | Email | In-App Notification |
|----------|---------|-------|---------------------|
| **Critical** | Yes | Yes | Yes (all org admins) |
| **Warning** | No | Yes | Yes (all org admins) |
| **Info** | Yes | No | No |

- **Critical**: Something is broken or needs immediate action (sync failure, webhook crash, plan limit exceeded)
- **Warning**: Something needs attention soon (plan at 80%, stale valuation, overdue call, integration error)
- **Info**: FYI events (new user signup)

---

## 2. Set Up Discord Alerts

1. In your Discord server, go to **Server Settings** > **Integrations** > **Webhooks**
2. Click **New Webhook**
3. Name it `Lacoda Capital Alerts` and choose a channel (e.g., `#alerts` or `#ops`)
4. Copy the webhook URL
5. Add to your `.env`:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdef...
```

For Supabase Edge Functions, also set it as a secret:

```bash
npx supabase secrets set DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### What Discord alerts look like

Alerts appear as rich embeds with:
- Color-coded sidebar (red = critical, amber = warning, blue = info)
- Title, description, severity badge
- Source (which system triggered it)
- Action URL (if applicable)
- Footer: "Lacoda Capital Alerts"

---

## 3. Set Up Email Alerts

1. Add comma-separated email addresses to your `.env`:

```env
ALERT_EMAIL_RECIPIENTS=ops@lacoda.capital,kevin@lacoda.capital
```

For Supabase Edge Functions:

```bash
npx supabase secrets set ALERT_EMAIL_RECIPIENTS=ops@lacoda.capital,kevin@lacoda.capital
```

2. Ensure Resend is configured (see `docs/integrations/resend-setup.md`)

Email alerts use the `operational_alert` template — a dark-themed email with severity badge, description, source, and optional action button.

---

## 4. What Triggers Alerts

### From Edge Functions (pg_cron)

| Source | Trigger | Severity |
|--------|---------|----------|
| `sync-balances` | Plaid balance sync fails for any integration | Critical |
| `check-expirations` | Documents expiring today or tomorrow | Critical |
| `check-overdue-calls` | Capital call marked as overdue | Warning |
| `smart-alert-digest` | Weekly digest has critical items (urgency >= 8) | Critical (Discord) |

### From Webhook Handlers

| Source | Trigger | Severity |
|--------|---------|----------|
| `stripe-webhook` | Unhandled error in Stripe webhook processing | Critical |
| `plaid-webhook` | `ITEM.ERROR` or `PENDING_EXPIRATION` event | Warning |
| `plaid-webhook` | Unhandled processing error | Critical |
| `docusign-webhook` | Unhandled error in DocuSign webhook processing | Critical |

### From Auth

| Source | Trigger | Severity |
|--------|---------|----------|
| `auth-callback` | New user signup (role = "pending") | Info |

### From Scheduled Checks (`lib/alerts/checks.ts`)

| Function | Trigger | Severity |
|----------|---------|----------|
| `checkStalePlaidSync` | Last sync > 24 hours ago | Critical |
| `checkPlanLimitAlerts` | Usage >= 80% of limit | Warning |
| `checkPlanLimitAlerts` | Usage > 100% of limit | Critical |
| `checkIntegrationHealth` | Integration status = "error" | Warning |
| `checkStaleValuations` | Asset not valued in 90+ days | Warning |
| `checkComplianceDeadlines` | Control due within 7 days | Warning |

---

## 5. Architecture

```
┌──────────────────────┐     ┌──────────────────┐
│ Edge Functions        │     │ Next.js Routes   │
│ (sync-balances, etc.) │     │ (webhooks, auth) │
└──────────┬───────────┘     └────────┬─────────┘
           │ inline dispatch          │ import dispatchAlert()
           ▼                          ▼
    ┌──────────────────────────────────────┐
    │         dispatchAlert(alert)          │
    │                                      │
    │  severity routing:                   │
    │    critical → Discord + Email + DB   │
    │    warning  → Email + DB             │
    │    info     → Discord                │
    └──────────────────────────────────────┘
           │           │           │
           ▼           ▼           ▼
      ┌─────────┐ ┌─────────┐ ┌────────────┐
      │ Discord │ │ Resend  │ │ Postgres   │
      │ Webhook │ │ Email   │ │ notifications│
      └─────────┘ └─────────┘ └────────────┘
```

### Edge Functions vs Next.js Routes

- **Edge Functions** (Deno runtime) can't import from `lib/`. They use inline dispatch helpers that make HTTP calls directly to Discord and the send-email Edge Function.
- **Next.js routes** import `dispatchAlert()` from `lib/alerts` which handles all routing logic.

---

## 6. Adding a New Alert

To dispatch an alert from any server-side code:

```typescript
import { dispatchAlert } from "@/lib/alerts"

await dispatchAlert({
  title: "Something happened",
  description: "Details about what happened and what to do.",
  severity: "warning",  // "critical" | "warning" | "info"
  source: "my-feature",
  orgId: "optional-org-id",  // enables in-app notifications for org admins
  actionUrl: "/app/somewhere",  // optional link
  metadata: { key: "value" },  // optional extra data in notification payload
})
```

The dispatcher **never throws** — all errors are caught and logged. Safe to call with `.catch(() => {})` in fire-and-forget contexts.

---

## 7. Environment Variables Summary

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `DISCORD_WEBHOOK_URL` | `.env` + Supabase Secrets | No | Discord webhook URL for alert channel |
| `ALERT_EMAIL_RECIPIENTS` | `.env` + Supabase Secrets | No | Comma-separated email list |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env` | Yes (for email) | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secrets | Yes (for email) | Service role key for Edge Function auth |

Both Discord and email are optional. If not configured, alerts are silently skipped for that channel.

---

## 8. Testing

```bash
# Run all alert tests
npx vitest run tests/unit/alert-dispatcher.test.ts
npx vitest run tests/unit/alert-discord.test.ts
npx vitest run tests/unit/alert-checks.test.ts
npx vitest run tests/integration/alert-flow.test.ts

# Run E2E (requires Playwright)
npx playwright test tests/e2e/alerts-discord.spec.ts
```

See test files for examples of mocking Discord, email, and database calls.
