import { z } from "zod";
import { createAIAgent } from "./base";

// ============================================================================
// Agent 2: Report Narrative Generation
// ============================================================================
//
// "Generate Summary" button in the report builder.
// Collects current period KPIs, previous period comparison,
// and notable ledger events. Claude writes a 2-3 paragraph
// professional summary referencing actual numbers. Editable
// rich text. report_version tracks AI vs manual.
// ============================================================================

// ─── Output Schema ──────────────────────────────────────────────────────────

export const narrativeOutputSchema = z.object({
  summary: z.string().min(1),
  key_highlights: z.array(z.string()).min(1),
  generated_by: z.literal("ai").default("ai"),
});

export type NarrativeOutput = z.infer<typeof narrativeOutputSchema>;

// ─── Agent ──────────────────────────────────────────────────────────────────

export const narrativeAgent = createAIAgent({
  agentType: "narrative",
  outputSchema: narrativeOutputSchema,
  maxTokens: 4096,

  systemPrompt: `You are a professional report writer for Lacoda Capital, a wealth management platform.
Your job is to write concise, professional narrative summaries for portfolio reports.

You MUST return valid JSON with exactly this structure:
{
  "summary": "2-3 paragraph professional narrative...",
  "key_highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
  "generated_by": "ai"
}

Rules:
- Write in a professional, confident tone suitable for high-net-worth clients.
- Reference ACTUAL numbers from the provided data — never hallucinate figures.
- Include specific dollar amounts, percentages, and asset names from the input.
- The summary should be 2-3 paragraphs covering: portfolio overview, performance, and notable changes.
- Key highlights should be 3-5 bullet-point-style strings summarizing the most important takeaways.
- Use precise language: "Total AUM increased 4.2% to $12.3M" not "the portfolio grew significantly."
- Compare current period to previous period when data is available.
- Mention any notable events (new assets, valuations, compliance items).
- Do NOT include disclaimers, legal boilerplate, or hedge language.
- Return ONLY the JSON object, no extra text.`,
});

// ─── Context Builder ────────────────────────────────────────────────────────

export interface NarrativeContextData {
  clientName: string;
  reportType: string;
  period: string;
  totalAUM: number;
  previousAUM?: number;
  assetAllocation: { assetClass: string; value: number; percentage: number }[];
  recentValuations: { assetName: string; value: number; previousValue?: number; date: string }[];
  notableEvents: { action: string; description: string; date: string }[];
}

export function buildNarrativePrompt(data: NarrativeContextData): string {
  const lines: string[] = [
    `Report Type: ${data.reportType}`,
    `Client: ${data.clientName}`,
    `Period: ${data.period}`,
    ``,
    `=== CURRENT PERIOD KPIs ===`,
    `Total AUM: $${data.totalAUM.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ];

  if (data.previousAUM !== undefined) {
    const change = ((data.totalAUM - data.previousAUM) / data.previousAUM) * 100;
    lines.push(
      `Previous Period AUM: $${data.previousAUM.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Change: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
    );
  }

  lines.push(``, `=== ASSET ALLOCATION ===`);
  for (const a of data.assetAllocation) {
    lines.push(
      `  ${a.assetClass}: $${a.value.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${a.percentage.toFixed(1)}%)`
    );
  }

  if (data.recentValuations.length > 0) {
    lines.push(``, `=== RECENT VALUATIONS ===`);
    for (const v of data.recentValuations) {
      let line = `  ${v.assetName}: $${v.value.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${v.date})`;
      if (v.previousValue !== undefined) {
        const pctChange = ((v.value - v.previousValue) / v.previousValue) * 100;
        line += ` — ${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}% from $${v.previousValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      }
      lines.push(line);
    }
  }

  if (data.notableEvents.length > 0) {
    lines.push(``, `=== NOTABLE EVENTS ===`);
    for (const e of data.notableEvents) {
      lines.push(`  [${e.date}] ${e.action}: ${e.description}`);
    }
  }

  return lines.join("\n");
}
