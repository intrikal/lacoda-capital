import { z } from "zod";
import { createAIAgent } from "./base";

// ============================================================================
// Agent 3: Document Request Email Drafting
// ============================================================================
//
// "Draft Email" button on document requests.
// Claude generates a professional email given: doc type, contact,
// deadline, and upload URL. User reviews, edits, then sends via Resend.
// ============================================================================

// ─── Output Schema ──────────────────────────────────────────────────────────

export const emailDraftOutputSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  tone: z.enum(["formal", "friendly", "urgent"]).default("formal"),
});

export type EmailDraftOutput = z.infer<typeof emailDraftOutputSchema>;

// ─── Agent ──────────────────────────────────────────────────────────────────

export const emailDraftAgent = createAIAgent({
  agentType: "email_draft",
  outputSchema: emailDraftOutputSchema,
  maxTokens: 2048,

  systemPrompt: `You are a professional email drafting assistant for Lacoda Capital, a wealth management platform.
Your job is to draft professional emails requesting documents from clients, CPAs, attorneys, or other third parties.

You MUST return valid JSON with exactly this structure:
{
  "subject": "Email subject line",
  "body": "Full email body as plain text with line breaks",
  "tone": "formal" | "friendly" | "urgent"
}

Rules:
- Write in a professional, polite tone appropriate for wealth management communications.
- Include the specific document type being requested.
- Include the deadline date if provided.
- Include the upload URL/link if provided so the recipient can upload directly.
- Include the contact's name in the greeting.
- Keep the email concise — 3-5 paragraphs maximum.
- Include a professional sign-off (e.g., "Best regards,").
- Do NOT include placeholder brackets like [Name] — use the actual provided values.
- If the deadline is soon (< 7 days), use an "urgent" tone and mention the time sensitivity.
- If no deadline, use "formal" tone.
- The body should use \\n for line breaks, not HTML.
- Return ONLY the JSON object, no extra text.`,
});

// ─── Context Builder ────────────────────────────────────────────────────────

export interface EmailDraftContextData {
  contactName: string;
  contactEmail: string;
  documentType: string;
  clientName?: string;
  entityName?: string;
  assetName?: string;
  deadline?: string;
  uploadUrl?: string;
  additionalNotes?: string;
  senderName: string;
  orgName: string;
}

export function buildEmailDraftPrompt(data: EmailDraftContextData): string {
  const lines: string[] = [
    `Draft a professional email requesting a document.`,
    ``,
    `=== REQUEST DETAILS ===`,
    `Recipient Name: ${data.contactName}`,
    `Recipient Email: ${data.contactEmail}`,
    `Document Type: ${data.documentType}`,
  ];

  if (data.clientName) lines.push(`Client: ${data.clientName}`);
  if (data.entityName) lines.push(`Entity: ${data.entityName}`);
  if (data.assetName) lines.push(`Asset: ${data.assetName}`);
  if (data.deadline) lines.push(`Deadline: ${data.deadline}`);
  if (data.uploadUrl) lines.push(`Upload URL: ${data.uploadUrl}`);
  if (data.additionalNotes) lines.push(`Additional Notes: ${data.additionalNotes}`);

  lines.push(``, `=== SENDER ===`);
  lines.push(`From: ${data.senderName}`);
  lines.push(`Organization: ${data.orgName}`);

  return lines.join("\n");
}
