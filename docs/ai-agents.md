# AI Agents

Lacoda Capital includes 4 AI agents powered by Claude (Anthropic). All agents use a shared framework (`lib/agents/base.ts`) that handles context assembly, API calls, Zod validation, and comprehensive logging.

---

## Overview

| Agent | Purpose | Trigger | Max Tokens |
|-------|---------|---------|------------|
| Extraction | Extract structured data from vault documents | "Extract Data" button on documents | 2,048 |
| Narrative | Generate portfolio report summaries | "Generate Summary" in report builder | 4,096 |
| Email Draft | Draft document request emails | "Draft Email" on document requests | 2,048 |
| Alert Digest | Prioritize weekly alerts by urgency | pg_cron (Monday 8 AM) | 4,096 |

All agents use `claude-sonnet-4-20250514` by default. Model is overridable per agent instance.

---

## Agent 1: Document Data Extraction

Extracts structured financial data from uploaded vault documents (appraisals, tax returns, K-1 forms, insurance policies, bank statements, etc.) and returns pre-filled form fields with confidence scores.

### Data sent to LLM

- Document name, MIME type, file size
- First 50,000 characters of document content

### Output

```typescript
{
  property_address: string | null,
  valuation_amount: number | null,
  valuation_date: string | null,     // ISO 8601
  appraiser_name: string | null,
  document_type: string | null,
  asset_name: string | null,
  asset_class: string | null,        // one of 13 asset classes
  confidence: {
    [field]: number                   // 0.0–1.0 per field
  }
}
```

### Confidence thresholds

- >= 0.8 — High confidence, shown as-is
- 0.5–0.8 — Flagged yellow in UI for review
- < 0.5 — Very uncertain, user should verify

### UI flow

1. User clicks **Extract Data** on a vault document
2. Dialog shows extracted fields with yellow highlights on low-confidence items
3. User reviews, edits if needed, clicks **Confirm & Create Asset**
4. Creates asset record (`source='ai_extraction'`) + valuation

### Files

- Agent: `lib/agents/extraction.ts`
- Action: `lib/actions/ai-extraction.actions.ts`
- UI: `components/ai/extract-data-button.tsx`
- Edge Function: `supabase/functions/ai-extract/index.ts`

---

## Agent 2: Report Narrative Generation

Generates professional 2–3 paragraph portfolio summaries for reports, including key highlights.

### Data sent to LLM

- Report type, client name, period (date range)
- Total AUM (current + previous period for comparison)
- Asset allocation breakdown (by class + percentage)
- Recent valuations (last 10, with % change)
- Notable ledger events (last 20)

### Output

```typescript
{
  summary: string,           // 2–3 paragraphs
  key_highlights: string[],  // 3–5 bullet points
  generated_by: "ai"
}
```

### UI flow

1. User clicks **Generate Summary** in report builder
2. Dialog shows editable narrative + key highlights
3. If user edits, flagged as "manual" before saving
4. Regenerate warns before replacing user edits
5. Saves to `report_versions` with version increment + `generatedBy` tracking

### Files

- Agent: `lib/agents/narrative.ts`
- Action: `lib/actions/ai-narrative.actions.ts`
- UI: `components/ai/generate-summary-button.tsx`
- Edge Function: `supabase/functions/ai-narrative/index.ts`

---

## Agent 3: Email Draft Generation

Drafts professional emails requesting documents from clients, CPAs, attorneys, or third parties.

### Data sent to LLM

- Recipient name/email, document type, client/entity/asset names
- Deadline (if set), upload URL (unique per document request)
- Additional notes, sender name, organization name

### Output

```typescript
{
  subject: string,
  body: string,                            // plain text with \n breaks
  tone: "formal" | "friendly" | "urgent"   // auto-selected by deadline proximity
}
```

Tone rules: deadline < 7 days → "urgent", otherwise → "formal".

### UI flow

1. User clicks **Draft Email** on a document request
2. Dialog shows editable subject + body + recipient
3. User optionally edits, clicks **Send Email**
4. Sends via Resend Edge Function, updates request status to "sent"

### Files

- Agent: `lib/agents/email-draft.ts`
- Action: `lib/actions/ai-email-draft.actions.ts`
- UI: `components/ai/draft-email-button.tsx`
- Edge Function: `supabase/functions/ai-email-draft/index.ts`

---

## Agent 4: Alert Digest (Automated)

Weekly scheduled job that collects all upcoming deadlines and issues across all orgs, uses Claude to prioritize by urgency, then sends email notifications and creates in-app alerts.

### Data collected

- Expiring documents (within 30 days)
- Already-expired documents
- Stale valuations (not valued in 90+ days)
- Past-due document requests
- Upcoming compliance deadlines (within 30 days)
- Expiring insurance policies (within 30 days)

### Urgency scoring (0–10)

| Days Remaining | Base Score |
|----------------|------------|
| 0 (today) | 10 |
| 1–3 | 9 |
| 4–7 | 8 |
| 8–14 | 6 |
| 15–30 | 4 |
| > 30 | 2 |

Adjustments: +1 for assets > $1M, +2 for > $10M, +1 for compliance items, 9–10 for overdue.

### Output

```typescript
{
  alerts: [{
    title: string,
    urgency_score: number,      // 0–10
    category: string,           // expiring_document, stale_valuation, etc.
    action_url: string | null,
    asset_value: number | null,
    days_remaining: number      // negative = overdue
  }],
  executive_summary: string,
  critical_count: number        // urgency >= 8
}
```

### Dispatch

- Email: Top 10 alerts via Resend (HTML template)
- Notifications: Top 5 → `notifications` table (in-app inbox)
- Discord: If `critical_count > 0`, posts embed with summary

### Files

- Agent: `lib/agents/alert-digest.ts`
- Edge Function: `supabase/functions/smart-alert-digest/index.ts`
- No UI button — fully automated via pg_cron

---

## Shared Infrastructure

### Base agent framework (`lib/agents/base.ts`)

```typescript
createAIAgent<TOutput>({
  agentType: "extraction" | "narrative" | "email_draft" | "alert_digest",
  outputSchema: ZodType,
  systemPrompt: string,
  model?: string,          // default: claude-sonnet-4-20250514
  timeoutMs?: number,      // default: 30,000
  maxTokens?: number,
  confidenceThreshold?: number  // default: 0.8
})
```

Returns an agent with:
```typescript
async run(userMessage, { orgId, actorUserId, targetId?, targetType? })
  → { success: true, data: T, latencyMs, logId }
  | { success: false, error, code }
```

Error codes: `EMPTY_CONTEXT`, `API_ERROR`, `PARSE_ERROR`, `TIMEOUT`, `VALIDATION_ERROR`.

### API details

- **Endpoint:** `https://api.anthropic.com/v1/messages` (direct HTTP fetch, no SDK)
- **Auth:** `x-api-key` header
- **Retry:** 1 retry on timeout or 5xx errors
- **Timeout:** 30 seconds via AbortController

### Cost estimation

Every call records estimated cost in `ai_call_log`:
- Sonnet 4: $3/M input, $15/M output
- Haiku 4.5: $0.80/M input, $4/M output
- Opus: $15/M input, $75/M output

### Audit logging (`ai_call_log` table)

Every AI call is logged with:
- `agentType`, `modelVersion`, `status` (success/error/timeout)
- `inputHash` (SHA-256 for dedup), `inputSummary` (first 500 chars)
- `output` (full JSONB), `latencyMs`
- `inputTokens`, `outputTokens`, `costEstimate`
- `actorUserId`, `targetId`, `targetType`
- `orgId`, `createdAt`

---

## Security

- All AI server actions require `requireRole("assistant")` or higher
- Extraction only works on documents within the user's org
- Input/output fully logged for audit trail
- Ledger events created on confirmation (append-only)
- SHA-256 input hashing for deduplication (caching not yet implemented)

---

## Configuration

### Required

```env
ANTHROPIC_API_KEY=sk-ant-xxx
```

Set in both `.env.local` (Next.js app) and Supabase secrets:
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
```

### Optional

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx   # For alert digest critical alerts
ALERT_EMAIL_RECIPIENTS=admin@example.com                    # For alert digest emails
```

### No feature flags

All AI features are enabled by default when `ANTHROPIC_API_KEY` is set. There are no A/B tests or gradual rollout mechanisms.
