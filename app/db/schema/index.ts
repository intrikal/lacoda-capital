/**
 * Schema Index - Central Export Point
 *
 * Kevin, this file re-exports all schema definitions.
 * Import from here for clean, consistent imports throughout the app.
 *
 * Usage:
 *   import { orgs, users, clients, orgsRelations } from "@/app/db/schema";
 *   import type { Org, NewOrg, Client } from "@/app/db/schema";
 */

// ============================================================================
// Enums
// ============================================================================
export {
  orgMemberRoleEnum,
  entityTypeEnum,
  assetClassEnum,
  assetStatusEnum,
  valuationSourceEnum,
  documentStatusEnum,
  documentRequestStatusEnum,
  taskStatusEnum,
  taskPriorityEnum,
  goalCategoryEnum,
  goalStatusEnum,
  goalPriorityEnum,
  complianceControlStatusEnum,
  conversationTypeEnum,
  messageSenderTypeEnum,
  calendarEventTypeEnum,
  ledgerActionEnum,
  ledgerTargetTypeEnum,
  reportTypeEnum,
  reportStatusEnum,
  integrationStatusEnum,
  integrationProviderEnum,
  notificationTypeEnum,
  dealStageEnum,
  dealTypeEnum,
  policyTypeEnum,
  policyStatusEnum,
  premiumFrequencyEnum,
  benchmarkCategoryEnum,
  billingStatusEnum,
  taxDeductionCategoryEnum,
  taxDeductionTypeEnum,
  taxDeductionStatusEnum,
} from "./00_enums";

// ============================================================================
// Organizations
// ============================================================================
export { orgs, orgsRelations } from "./orgs";
export type { Org, NewOrg, OrgSettings } from "./orgs";

// ============================================================================
// Users
// ============================================================================
export { users, usersRelations } from "./users";
export type { User, NewUser, UserPreferences } from "./users";

// ============================================================================
// Organization Members
// ============================================================================
export { orgMembers, orgMembersRelations } from "./org_members";
export type { OrgMember, NewOrgMember } from "./org_members";

// ============================================================================
// Clients
// ============================================================================
export { clients, clientsRelations } from "./clients";
export type { Client, NewClient, ClientProfile } from "./clients";

// ============================================================================
// Assignments (Assistant ↔ Client)
// ============================================================================
export { assignments, assignmentsRelations } from "./assignments";
export type { Assignment, NewAssignment } from "./assignments";

// ============================================================================
// Entities
// ============================================================================
export { entities, entitiesRelations } from "./entities";
export type { Entity, NewEntity, EntityMetadata } from "./entities";

// ============================================================================
// Assets
// ============================================================================
export { assets, assetsRelations } from "./assets";
export type { Asset, NewAsset, AssetMetadata } from "./assets";

// ============================================================================
// Valuations
// ============================================================================
export { valuations, valuationsRelations } from "./valuations";
export type { Valuation, NewValuation } from "./valuations";

// ============================================================================
// Documents
// ============================================================================
export { documents, documentsRelations } from "./documents";
export type { Document, NewDocument, DocumentMetadata } from "./documents";

// ============================================================================
// Document Requests
// ============================================================================
export { documentRequests, documentRequestsRelations } from "./document_requests";
export type {
  DocumentRequest,
  NewDocumentRequest,
  DocumentRequestMetadata,
} from "./document_requests";

// ============================================================================
// Tasks
// ============================================================================
export { tasks, tasksRelations } from "./tasks";
export type { Task, NewTask, TaskMetadata } from "./tasks";

// ============================================================================
// Goals
// ============================================================================
export { goals, goalsRelations } from "./goals";
export type { Goal, NewGoal, GoalMetadata } from "./goals";

// ============================================================================
// Ledger Events (Audit Log)
// ============================================================================
export { ledgerEvents, ledgerEventsRelations } from "./ledger_events";
export type { LedgerEvent, NewLedgerEvent, LedgerPayload } from "./ledger_events";

// ============================================================================
// Reports
// ============================================================================
export {
  reports,
  reportVersions,
  reportsRelations,
  reportVersionsRelations,
} from "./reports";
export type {
  Report,
  NewReport,
  ReportVersion,
  NewReportVersion,
  ReportParameters,
} from "./reports";

// ============================================================================
// Compliance
// ============================================================================
export {
  complianceControls,
  complianceEvidence,
  complianceControlsRelations,
  complianceEvidenceRelations,
} from "./compliance";
export type {
  ComplianceControl,
  NewComplianceControl,
  ComplianceEvidence,
  NewComplianceEvidence,
  ComplianceControlMetadata,
} from "./compliance";

// ============================================================================
// Integrations
// ============================================================================
export { integrations, integrationsRelations } from "./integrations";
export type {
  Integration,
  NewIntegration,
  IntegrationSettings,
} from "./integrations";

// ============================================================================
// Messages
// ============================================================================
export {
  conversations,
  messages,
  conversationsRelations,
  messagesRelations,
} from "./messages";
export type {
  Conversation,
  NewConversation,
  Message,
  NewMessage,
  ConversationMetadata,
  MessageMetadata,
  MessageAttachment,
} from "./messages";

// ============================================================================
// Calendar Events
// ============================================================================
export { calendarEvents, calendarEventsRelations } from "./calendar_events";
export type {
  CalendarEvent as CalendarEventRecord,
  NewCalendarEvent,
  CalendarEventMetadata,
} from "./calendar_events";

// ============================================================================
// Notifications
// ============================================================================
export { notifications, notificationsRelations } from "./notifications";
export type {
  Notification,
  NewNotification,
  NotificationPayload,
} from "./notifications";

// ============================================================================
// Deals (Pipeline)
// ============================================================================
export { deals, dealsRelations } from "./deals";
export type { Deal as DealRecord, NewDeal } from "./deals";

// ============================================================================
// Insurance Policies
// ============================================================================
export { insurancePolicies, insurancePoliciesRelations } from "./insurance_policies";
export type {
  InsurancePolicy,
  NewInsurancePolicy,
  InsurancePolicyMetadata,
  InsuranceAgent,
} from "./insurance_policies";

// ============================================================================
// Benchmarks
// ============================================================================
export { benchmarks, benchmarksRelations } from "./benchmarks";
export type { Benchmark, NewBenchmark, BenchmarkMetadata } from "./benchmarks";

// ============================================================================
// Billing Records
// ============================================================================
export { billingRecords, billingRecordsRelations } from "./billing_records";
export type {
  BillingRecord,
  NewBillingRecord,
  BillingRecordMetadata,
} from "./billing_records";

// ============================================================================
// Tax Deductions
// ============================================================================
export { taxDeductions, taxDeductionsRelations } from "./tax_deductions";
export type {
  TaxDeduction,
  NewTaxDeduction,
  TaxDeductionMetadata,
} from "./tax_deductions";

// ============================================================================
// SAML Providers (SSO)
// ============================================================================
export { samlProviders, samlProvidersRelations } from "./saml_providers";
export type {
  SamlProvider,
  NewSamlProvider,
  SamlAttributeMapping,
} from "./saml_providers";

// ============================================================================
// API Keys
// ============================================================================
export { apiKeys, apiKeysRelations } from "./api_keys";
export type { ApiKey, NewApiKey } from "./api_keys";
