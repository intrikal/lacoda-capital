CREATE TYPE "public"."asset_class" AS ENUM('real_estate', 'equities', 'fixed_income', 'private_equity', 'venture_capital', 'hedge_funds', 'commodities', 'cash', 'crypto', 'collectibles', 'intellectual_property', 'insurance', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('active', 'pending', 'sold', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."document_request_status" AS ENUM('open', 'fulfilled', 'cancelled', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'verified', 'expired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('personal', 'llc', 'trust', 'corporation', 'partnership', 'foundation');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('plaid', 'yodlee', 'quickbooks', 'xero', 'salesforce', 'hubspot', 'google_drive', 'dropbox', 'docusign', 'other');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('connected', 'disconnected', 'error', 'pending');--> statement-breakpoint
CREATE TYPE "public"."ledger_action" AS ENUM('created', 'updated', 'deleted', 'archived', 'document_uploaded', 'document_verified', 'document_expired', 'document_downloaded', 'asset_valued', 'asset_transferred', 'asset_sold', 'login', 'logout', 'permission_changed', 'report_generated', 'report_shared', 'compliance_reviewed', 'compliance_approved');--> statement-breakpoint
CREATE TYPE "public"."ledger_target_type" AS ENUM('org', 'user', 'client', 'entity', 'asset', 'document', 'task', 'report');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('task_assigned', 'task_due', 'document_uploaded', 'document_expiring', 'document_requested', 'report_ready', 'compliance_alert', 'system');--> statement-breakpoint
CREATE TYPE "public"."org_member_role" AS ENUM('admin', 'assistant', 'client');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('portfolio_summary', 'asset_allocation', 'performance', 'tax_summary', 'compliance', 'client_statement', 'custom');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"asset_class" "asset_class" NOT NULL,
	"status" "asset_status" DEFAULT 'active' NOT NULL,
	"acquisition_date" timestamp with time zone,
	"acquisition_cost" numeric(18, 2),
	"currency" text DEFAULT 'USD',
	"current_value" numeric(18, 2),
	"valued_at" timestamp with time zone,
	"external_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assistant_member_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_assistant_client_unique" UNIQUE("assistant_member_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"phone" text,
	"external_id" text,
	"profile" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"frequency" text,
	"required_document_types" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_controls_org_code_unique" UNIQUE("org_id","code")
);
--> statement-breakpoint
CREATE TABLE "compliance_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"control_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"entity_id" uuid,
	"asset_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"document_type" text,
	"status" "document_request_status" DEFAULT 'open' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp with time zone,
	"requested_by" uuid,
	"assigned_to" uuid,
	"fulfilled_at" timestamp with time zone,
	"fulfilled_document_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"entity_id" uuid,
	"asset_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"mime_type" text,
	"file_size" text,
	"storage_path" text NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"jurisdiction" text,
	"formation_date" timestamp with time zone,
	"tax_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"name" text NOT NULL,
	"status" "integration_status" DEFAULT 'disconnected' NOT NULL,
	"status_message" text,
	"external_account_id" text,
	"external_item_id" text,
	"last_sync_at" timestamp with time zone,
	"last_sync_status" text,
	"sync_error_message" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"vault_secret_id" text,
	"connected_by" uuid,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_org_provider_unique" UNIQUE("org_id","provider")
);
--> statement-breakpoint
CREATE TABLE "ledger_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"target_type" "ledger_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"action" "ledger_action" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"read_at" timestamp with time zone,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_member_role" DEFAULT 'client' NOT NULL,
	"client_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_org_user_unique" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orgs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "report_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"storage_path" text,
	"content_hash" text,
	"parameters_snapshot" jsonb DEFAULT '{}'::jsonb,
	"generated_by" uuid,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"shared_at" timestamp with time zone,
	"shared_with" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"report_type" "report_type" NOT NULL,
	"status" "report_status" DEFAULT 'draft' NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb,
	"current_version_id" uuid,
	"current_version_number" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp with time zone,
	"assigned_to" uuid,
	"created_by" uuid,
	"client_id" uuid,
	"entity_id" uuid,
	"asset_id" uuid,
	"document_id" uuid,
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"phone" text,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"as_of_date" timestamp with time zone NOT NULL,
	"value" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD',
	"source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assistant_member_id_org_members_id_fk" FOREIGN KEY ("assistant_member_id") REFERENCES "public"."org_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD CONSTRAINT "compliance_controls_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_control_id_compliance_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."compliance_controls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_entity_id_idx" ON "assets" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "assets_entity_class_idx" ON "assets" USING btree ("entity_id","asset_class");--> statement-breakpoint
CREATE INDEX "assets_entity_status_idx" ON "assets" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "assets_external_id_idx" ON "assets" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "assignments_assistant_member_id_idx" ON "assignments" USING btree ("assistant_member_id");--> statement-breakpoint
CREATE INDEX "assignments_client_id_idx" ON "assignments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "clients_org_id_idx" ON "clients" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "clients_org_created_at_idx" ON "clients" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "clients_org_external_id_idx" ON "clients" USING btree ("org_id","external_id");--> statement-breakpoint
CREATE INDEX "clients_org_email_idx" ON "clients" USING btree ("org_id","email");--> statement-breakpoint
CREATE INDEX "compliance_controls_org_id_idx" ON "compliance_controls" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "compliance_controls_org_category_idx" ON "compliance_controls" USING btree ("org_id","category");--> statement-breakpoint
CREATE INDEX "compliance_controls_org_active_idx" ON "compliance_controls" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "compliance_evidence_control_id_idx" ON "compliance_evidence" USING btree ("control_id");--> statement-breakpoint
CREATE INDEX "compliance_evidence_document_id_idx" ON "compliance_evidence" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "compliance_evidence_client_id_idx" ON "compliance_evidence" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "compliance_evidence_valid_until_idx" ON "compliance_evidence" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "compliance_evidence_status_idx" ON "compliance_evidence" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_requests_org_id_idx" ON "document_requests" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "document_requests_org_client_idx" ON "document_requests" USING btree ("org_id","client_id");--> statement-breakpoint
CREATE INDEX "document_requests_org_status_idx" ON "document_requests" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "document_requests_due_date_idx" ON "document_requests" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "document_requests_assigned_to_idx" ON "document_requests" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "documents_org_id_idx" ON "documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "documents_org_client_idx" ON "documents" USING btree ("org_id","client_id");--> statement-breakpoint
CREATE INDEX "documents_org_entity_idx" ON "documents" USING btree ("org_id","entity_id");--> statement-breakpoint
CREATE INDEX "documents_org_asset_idx" ON "documents" USING btree ("org_id","asset_id");--> statement-breakpoint
CREATE INDEX "documents_org_status_idx" ON "documents" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "documents_expires_at_idx" ON "documents" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "documents_org_created_at_idx" ON "documents" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "entities_client_id_idx" ON "entities" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "entities_client_type_idx" ON "entities" USING btree ("client_id","entity_type");--> statement-breakpoint
CREATE INDEX "integrations_org_id_idx" ON "integrations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "integrations_org_status_idx" ON "integrations" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "integrations_provider_idx" ON "integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ledger_events_org_id_idx" ON "ledger_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ledger_events_actor_user_id_idx" ON "ledger_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "ledger_events_target_idx" ON "ledger_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "ledger_events_org_created_at_idx" ON "ledger_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_events_org_action_idx" ON "ledger_events" USING btree ("org_id","action");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_user_type_idx" ON "notifications" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "notifications_user_created_at_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_org_id_idx" ON "notifications" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_members_org_id_idx" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_members_user_id_idx" ON "org_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_members_org_role_idx" ON "org_members" USING btree ("org_id","role");--> statement-breakpoint
CREATE INDEX "orgs_slug_idx" ON "orgs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "orgs_created_at_idx" ON "orgs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "report_versions_report_id_idx" ON "report_versions" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_versions_report_version_idx" ON "report_versions" USING btree ("report_id","version_number");--> statement-breakpoint
CREATE INDEX "reports_org_id_idx" ON "reports" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "reports_org_client_idx" ON "reports" USING btree ("org_id","client_id");--> statement-breakpoint
CREATE INDEX "reports_org_type_idx" ON "reports" USING btree ("org_id","report_type");--> statement-breakpoint
CREATE INDEX "reports_org_status_idx" ON "reports" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "reports_org_created_at_idx" ON "reports" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "tasks_org_id_idx" ON "tasks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tasks_assigned_to_idx" ON "tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "tasks_org_status_idx" ON "tasks" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_org_client_idx" ON "tasks" USING btree ("org_id","client_id");--> statement-breakpoint
CREATE INDEX "tasks_org_created_at_idx" ON "tasks" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "valuations_asset_id_idx" ON "valuations" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "valuations_asset_date_idx" ON "valuations" USING btree ("asset_id","as_of_date");--> statement-breakpoint
CREATE INDEX "valuations_asset_created_idx" ON "valuations" USING btree ("asset_id","created_at");