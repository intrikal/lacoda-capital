# Supabase Edge Functions

Lacoda Capital uses 13 Supabase Edge Functions (Deno runtime) for AI operations, webhooks, scheduled tasks, and integration glue. Each function is self-contained with no shared utility files.

---

## Function Overview

| Function | Trigger | Purpose |
|----------|---------|---------|
| `ai-email-draft` | Manual | Draft document request emails using Claude |
| `ai-extract` | Manual | Extract structured data from vault documents |
| `ai-narrative` | Manual | Generate portfolio report narratives |
| `smart-alert-digest` | pg_cron (Mon 8 AM) | AI-prioritized weekly alert summary |
| `send-email` | Called by others | Central Resend email dispatcher (6 templates) |
| `check-expirations` | pg_cron (daily 8 AM) | Document expiration reminders |
| `check-overdue-calls` | pg_cron (daily 8 AM) | Mark overdue capital calls, notify admins |
| `weekly-digest` | pg_cron (Mon 8 AM) | Weekly activity summary email |
| `sync-balances` | pg_cron (daily) | Pull Plaid balances, create valuations |
| `plaid-link-token` | Manual | Create Plaid Link token for client-side UI |
| `plaid-exchange-token` | Manual | Exchange Plaid public token, create assets |
| `docusign-create-envelope` | Manual | Create DocuSign envelope for embedded signing |
| `docusign-webhook` | DocuSign Connect | Process signed envelopes, auto-file to vault |

---

## AI Functions

### `ai-email-draft`

Generates professional document request emails using Claude Sonnet 4.

- **Request:** `{ requestId, orgId, actorUserId, contextPrompt }`
- **Response:** `{ subject, body, tone }` where tone is formal/friendly/urgent
- **Model:** claude-sonnet-4-20250514, max 2,048 tokens, 30s timeout
- **Logging:** Every call → `ai_call_log` table with token counts and cost estimate

### `ai-extract`

Extracts structured financial data from uploaded documents using Claude vision/OCR.

- **Request:** `{ documentId, storagePath, documentName, mimeType, orgId, actorUserId }`
- **Response:** Extracted fields (property_address, valuation_amount, asset_class, etc.) with confidence scores (0.0–1.0)
- **Storage:** Reads from `documents` bucket in Supabase Storage (first 50KB)
- **Model:** claude-sonnet-4-20250514, max 2,048 tokens, 30s timeout

### `ai-narrative`

Generates professional 2–3 paragraph report narratives from portfolio data.

- **Request:** `{ reportId, orgId, actorUserId, contextPrompt }`
- **Response:** `{ summary, key_highlights, generated_by: "ai" }`
- **Model:** claude-sonnet-4-20250514, max 4,096 tokens, 30s timeout

### `smart-alert-digest`

AI-powered weekly digest that queries expirations, stale valuations, past-due requests, compliance deadlines, and insurance expiries, then uses Claude to prioritize by urgency score (0–10).

- **Schedule:** Monday 8:00 AM UTC via pg_cron
- **Output:** Sends HTML email (top 10 alerts) + creates top 5 in-app notifications + posts to Discord if critical alerts exist
- **Urgency scoring:** Base score from days remaining, +1/+2 for high-value assets (>$1M/>$10M), +1 for compliance items, 9–10 for overdue
- **RPC:** Uses `get_stale_valuations(p_org_id, p_stale_days)` for valuation freshness check

---

## Email Function

### `send-email`

Central email dispatcher called by other Edge Functions. Routes to Resend API with 6 HTML templates.

| Template Type | Subject Pattern | Use Case |
|---------------|----------------|----------|
| `expiration_reminder` | "Document is expiring soon" | Document expiration alerts |
| `team_invite` | "{name} invited you to {org}" | Team invitations |
| `weekly_digest` | "Weekly Digest — {org}" | Activity summaries |
| `document_request_email` | Custom subject | AI-drafted doc requests |
| `smart_alert_digest` | "N critical alert(s)" | AI-prioritized alerts |
| `operational_alert` | Severity-prefixed title | System alerts |

- **Retry:** 3 attempts with exponential backoff (1s, 2s, 4s)
- **From:** `Lacoda Capital <notifications@lacoda.capital>`

---

## Scheduled Functions

### `check-expirations`

Daily check for documents expiring within 7 days.

- **Schedule:** Daily 8:00 AM UTC
- Groups documents by org → user, sends one summary email per user
- Respects user opt-out (`preferences.email_preferences.expirationReminders`)
- Dispatches Discord alerts for documents expiring today/tomorrow

### `check-overdue-calls`

Daily check for past-due capital calls.

- **Schedule:** Daily 8:00 AM UTC
- Updates `capital_events` status to "overdue"
- Creates in-app notifications for org admins/assistants
- Sends email alerts to `ALERT_EMAIL_RECIPIENTS`

### `weekly-digest`

Weekly activity summary for each organization.

- **Schedule:** Monday 8:00 AM UTC
- Collects: new assets, recent valuations (with % change), upcoming task deadlines
- Uses RPCs: `get_org_new_assets`, `get_org_recent_valuations`
- Respects user opt-out (`email_preferences.digest !== "never"`)

### `sync-balances`

Daily Plaid balance synchronization.

- **Schedule:** Daily (configurable time)
- For each connected Plaid integration: retrieves access token from Vault, calls Plaid `/accounts/balance/get`, creates valuations
- Handles `ITEM_LOGIN_REQUIRED` (marks as disconnected), 429 rate limits
- Maintains sync history (last 30 attempts)
- Can target a single integration: `{ integrationId: "..." }`

---

## Integration Functions

### `plaid-link-token`

Creates short-lived Plaid Link token for client-side Plaid Link UI.

- **Auth:** Bearer token (authenticated user)
- **Products:** auth, transactions
- **Countries:** US only
- **Response:** `{ link_token, expiration }`

### `plaid-exchange-token`

Exchanges Plaid public token after successful Link flow.

- **Flow:** Exchange token → store access token in Vault → create integration record → fetch balances → create assets + valuations
- **Account mapping:** depository/checking/savings → `cash`, investment → `equities`, loan → `cash`

### `docusign-create-envelope`

Creates DocuSign envelope for embedded signing.

- **Auth:** Bearer token (authenticated user)
- **Flow:** Authenticate → fetch DocuSign token from Vault → create envelope → generate signing URL
- **Response:** `{ envelopeId, signingUrl }`

### `docusign-webhook`

Processes DocuSign Connect webhook events.

- **Security:** HMAC-SHA256 signature verification (header `x-docusign-signature-1`)
- **Status mapping:** completed → approved, declined → declined, voided → expired
- **On completion:** Downloads signed PDF → uploads to Storage → creates `documents` record with tags `["signed", "docusign"]`
- **Idempotent:** Skips re-processing if already at same status

---

## Deployment

### Deploy all functions

```bash
# Login and link project
npx supabase login
npx supabase link --project-ref <your-project-ref>

# Deploy each function
for fn in ai-email-draft ai-extract ai-narrative smart-alert-digest \
          send-email check-expirations check-overdue-calls weekly-digest \
          sync-balances plaid-link-token plaid-exchange-token \
          docusign-create-envelope docusign-webhook; do
  npx supabase functions deploy "$fn"
done
```

### Set secrets

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
npx supabase secrets set RESEND_API_KEY=re_xxx
npx supabase secrets set PLAID_CLIENT_ID=xxx
npx supabase secrets set PLAID_SECRET=xxx
npx supabase secrets set DOCUSIGN_ACCOUNT_ID=xxx
npx supabase secrets set DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx
npx supabase secrets set ALERT_EMAIL_RECIPIENTS=admin@example.com
npx supabase secrets set APP_URL=https://app.lacoda.capital
```

### Set up pg_cron schedules

Enable the `pg_cron` extension in Supabase Dashboard: **Database** > **Extensions** > search "pg_cron".

Then run in the SQL Editor:

```sql
-- Document expiration checks (daily 8 AM UTC)
SELECT cron.schedule(
  'check-document-expirations',
  '0 8 * * *',
  $$SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/check-expirations',
    headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb
  )$$
);

-- Overdue capital calls (daily 8 AM UTC)
SELECT cron.schedule(
  'check-overdue-calls',
  '0 8 * * *',
  $$SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/check-overdue-calls',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )$$
);

-- Smart alert digest (Monday 8 AM UTC)
SELECT cron.schedule(
  'smart-alert-digest',
  '0 8 * * 1',
  $$SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/smart-alert-digest',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )$$
);

-- Weekly digest (Monday 8 AM UTC)
SELECT cron.schedule(
  'weekly-digest',
  '0 8 * * 1',
  $$SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/weekly-digest',
    headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb
  )$$
);

-- Plaid balance sync (daily 9 AM UTC)
SELECT cron.schedule(
  'sync-plaid-balances',
  '0 9 * * *',
  $$SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-balances',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )$$
);
```

### Local development

```bash
# Serve a single function locally
npx supabase functions serve ai-extract --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/ai-extract \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"documentId": "...", "storagePath": "...", "documentName": "test.pdf", "orgId": "...", "actorUserId": "..."}'
```

---

## Environment Variables

| Variable | Required By | Purpose |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | ai-*, smart-alert-digest | Claude API access |
| `SUPABASE_URL` | All | Project URL (auto-injected) |
| `SUPABASE_SERVICE_ROLE_KEY` | All | DB access (auto-injected) |
| `SUPABASE_ANON_KEY` | docusign-create-envelope, plaid-* | User auth |
| `RESEND_API_KEY` | send-email | Email API |
| `PLAID_CLIENT_ID` | plaid-*, sync-balances | Plaid client ID |
| `PLAID_SECRET` | plaid-*, sync-balances | Plaid secret |
| `PLAID_ENV` | plaid-*, sync-balances | sandbox / development / production |
| `DOCUSIGN_ACCOUNT_ID` | docusign-* | DocuSign account |
| `DOCUSIGN_BASE_URL` | docusign-* | Defaults to demo |
| `DOCUSIGN_HMAC_KEY` | docusign-webhook | Webhook signature verification |
| `DISCORD_WEBHOOK_URL` | check-*, smart-alert-digest, sync-balances | Alert notifications |
| `ALERT_EMAIL_RECIPIENTS` | check-*, sync-balances | Ops email alerts |
| `APP_URL` | send-email, docusign-create-envelope | Email link base URL |
