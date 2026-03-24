export { createAIAgent, flagLowConfidenceFields } from "./base";
export type { AgentConfig, AgentContext, AgentResult, AgentError, AgentResponse } from "./base";

export { extractionAgent, extractionOutputSchema, getExtractionFlaggedFields } from "./extraction";
export type { ExtractionOutput } from "./extraction";

export { narrativeAgent, narrativeOutputSchema, buildNarrativePrompt } from "./narrative";
export type { NarrativeOutput, NarrativeContextData } from "./narrative";

export { emailDraftAgent, emailDraftOutputSchema, buildEmailDraftPrompt } from "./email-draft";
export type { EmailDraftOutput, EmailDraftContextData } from "./email-draft";

export { alertDigestAgent, alertDigestOutputSchema, buildDigestPrompt } from "./alert-digest";
export type { AlertDigestOutput, AlertItem, DigestContextData, DigestContextItem } from "./alert-digest";
