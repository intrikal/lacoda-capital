import { z } from "zod";
import { createAIAgent, flagLowConfidenceFields } from "./base";

// ============================================================================
// Agent 1: Document Data Extraction
// ============================================================================
//
// "Extract Data" button on uploaded vault documents.
// Reads file content, sends to Claude with structured prompt,
// returns pre-filled form data with confidence scores per field.
// Yellow highlight on confidence < 0.8. User confirms → creates
// asset + valuation with source='ai_extraction'.
// ============================================================================

// ─── Output Schema ──────────────────────────────────────────────────────────

export const extractionOutputSchema = z.object({
  property_address: z.string().nullable(),
  valuation_amount: z.number().nullable(),
  valuation_date: z.string().nullable(),
  appraiser_name: z.string().nullable(),
  document_type: z.string().nullable(),
  asset_name: z.string().nullable(),
  asset_class: z.string().nullable(),
  confidence: z.record(z.string(), z.number().min(0).max(1)),
});

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

// ─── Agent ──────────────────────────────────────────────────────────────────

export const extractionAgent = createAIAgent({
  agentType: "extraction",
  outputSchema: extractionOutputSchema,
  maxTokens: 2048,

  systemPrompt: `You are a document data extraction agent for a wealth management platform (Lacoda Capital).
Your job is to extract structured data from uploaded documents (appraisals, tax returns, insurance policies, bank statements, property deeds, etc.).

You MUST return valid JSON with exactly this structure:
{
  "property_address": string | null,
  "valuation_amount": number | null,
  "valuation_date": string | null (ISO 8601 date, e.g. "2024-06-15"),
  "appraiser_name": string | null,
  "document_type": string | null (e.g. "appraisal", "tax_return", "insurance_policy", "bank_statement", "deed", "k1", "trust_agreement"),
  "asset_name": string | null (a descriptive name for the asset, e.g. "123 Main St, Springfield" or "Vanguard S&P 500 ETF"),
  "asset_class": string | null (one of: "real_estate", "equities", "fixed_income", "private_equity", "venture_capital", "hedge_funds", "commodities", "cash", "crypto", "collectibles", "intellectual_property", "insurance", "other"),
  "confidence": {
    "property_address": 0.0-1.0,
    "valuation_amount": 0.0-1.0,
    "valuation_date": 0.0-1.0,
    "appraiser_name": 0.0-1.0,
    "document_type": 0.0-1.0,
    "asset_name": 0.0-1.0,
    "asset_class": 0.0-1.0
  }
}

Rules:
- Set fields to null if the information is not found in the document.
- Set confidence to 0 for null fields.
- Confidence 1.0 = explicitly stated in the document with no ambiguity.
- Confidence 0.5-0.8 = inferred or partially visible.
- Confidence < 0.5 = very uncertain, poor quality scan, or non-English.
- For valuation_amount, extract the primary/total value (not individual line items).
- For valuation_date, use the most recent date associated with the valuation.
- Return ONLY the JSON object, no extra text.`,
});

// ─── Helper ─────────────────────────────────────────────────────────────────

export function getExtractionFlaggedFields(
  data: ExtractionOutput,
  threshold = 0.8
): string[] {
  return flagLowConfidenceFields(data.confidence, threshold);
}
