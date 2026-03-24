import { z } from "zod";
import { createAIAgent } from "./base";

// ============================================================================
// Agent 4: Smart Alert Digest
// ============================================================================
//
// Weekly pg_cron Edge Function: queries expirations (30-day window),
// stale valuations (90+ days), past-due requests, compliance deadlines.
// Claude prioritizes by urgency (weighted by asset value + days remaining).
// HTML email via Resend + top-5 in-app notifications.
// ============================================================================

// ─── Output Schema ──────────────────────────────────────────────────────────

const alertItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  urgency_score: z.number().min(0).max(10),
  category: z.enum([
    "expiring_document",
    "stale_valuation",
    "past_due_request",
    "compliance_deadline",
    "insurance_expiry",
  ]),
  action_url: z.string().nullable(),
  asset_value: z.number().nullable(),
  days_remaining: z.number().nullable(),
});

export const alertDigestOutputSchema = z.object({
  alerts: z.array(alertItemSchema),
  executive_summary: z.string(),
  total_items: z.number(),
  critical_count: z.number(),
});

export type AlertDigestOutput = z.infer<typeof alertDigestOutputSchema>;
export type AlertItem = z.infer<typeof alertItemSchema>;

// ─── Agent ──────────────────────────────────────────────────────────────────

export const alertDigestAgent = createAIAgent({
  agentType: "alert_digest",
  outputSchema: alertDigestOutputSchema,
  maxTokens: 4096,

  systemPrompt: `You are an alert prioritization agent for Lacoda Capital, a wealth management platform.
Your job is to analyze a list of upcoming deadlines, expirations, and compliance items, then prioritize them by urgency.

You MUST return valid JSON with exactly this structure:
{
  "alerts": [
    {
      "title": "Short alert title",
      "description": "One-sentence description of what needs attention",
      "urgency_score": 0-10 (10 = most urgent),
      "category": "expiring_document" | "stale_valuation" | "past_due_request" | "compliance_deadline" | "insurance_expiry",
      "action_url": "/app/vault/doc-id" or null,
      "asset_value": dollar amount or null,
      "days_remaining": integer or null (negative = overdue)
    }
  ],
  "executive_summary": "1-2 sentence summary of the most critical items",
  "total_items": number,
  "critical_count": number (items with urgency >= 8)
}

Urgency scoring rules:
- Base score from days_remaining: 0 days = 10, 1-3 days = 9, 4-7 days = 8, 8-14 days = 6, 15-30 days = 4, >30 days = 2
- Adjust up (+1-2) for high asset_value (>$1M = +1, >$10M = +2)
- Adjust up (+1) for compliance_deadline category (regulatory risk)
- Adjust up (+1) for insurance_expiry on high-value assets
- Overdue items (negative days_remaining) always score 9-10
- Sort alerts by urgency_score descending
- Cap the urgency_score at 10
- Return ALL items, sorted by urgency (the caller will truncate for email/notifications)
- Return ONLY the JSON object, no extra text.`,
});

// ─── Context Builder ────────────────────────────────────────────────────────

export interface DigestContextItem {
  type: "expiring_document" | "stale_valuation" | "past_due_request" | "compliance_deadline" | "insurance_expiry";
  title: string;
  description: string;
  daysRemaining: number | null;
  assetValue: number | null;
  assetName?: string;
  clientName?: string;
  actionUrl?: string;
}

export interface DigestContextData {
  orgName: string;
  items: DigestContextItem[];
}

export function buildDigestPrompt(data: DigestContextData): string {
  if (data.items.length === 0) {
    return "No items require attention this week. Return an empty alerts array with an executive_summary of 'All clear — no urgent items this week.'";
  }

  const lines: string[] = [
    `Organization: ${data.orgName}`,
    `Total items to prioritize: ${data.items.length}`,
    ``,
    `=== ITEMS ===`,
  ];

  for (const item of data.items) {
    lines.push(`---`);
    lines.push(`Type: ${item.type}`);
    lines.push(`Title: ${item.title}`);
    lines.push(`Description: ${item.description}`);
    if (item.daysRemaining !== null) lines.push(`Days Remaining: ${item.daysRemaining}`);
    if (item.assetValue !== null) lines.push(`Asset Value: $${item.assetValue.toLocaleString("en-US")}`);
    if (item.assetName) lines.push(`Asset: ${item.assetName}`);
    if (item.clientName) lines.push(`Client: ${item.clientName}`);
    if (item.actionUrl) lines.push(`Action URL: ${item.actionUrl}`);
  }

  return lines.join("\n");
}
