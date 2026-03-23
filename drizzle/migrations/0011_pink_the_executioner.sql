CREATE TYPE "public"."valuation_source" AS ENUM('manual', 'appraisal', 'market_data', 'ai_extraction', 'api_feed');--> statement-breakpoint
ALTER TABLE "ledger_events" DROP CONSTRAINT "ledger_events_actor_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "compliance_controls" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "compliance_controls" ALTER COLUMN "status" SET DEFAULT 'not_started'::text;--> statement-breakpoint
DROP TYPE "public"."compliance_control_status";--> statement-breakpoint
CREATE TYPE "public"."compliance_control_status" AS ENUM('not_started', 'in_progress', 'implemented', 'verified');--> statement-breakpoint
ALTER TABLE "compliance_controls" ALTER COLUMN "status" SET DEFAULT 'not_started'::"public"."compliance_control_status";--> statement-breakpoint
ALTER TABLE "compliance_controls" ALTER COLUMN "status" SET DATA TYPE "public"."compliance_control_status" USING "status"::"public"."compliance_control_status";--> statement-breakpoint
ALTER TABLE "document_requests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "document_requests" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."document_request_status";--> statement-breakpoint
CREATE TYPE "public"."document_request_status" AS ENUM('pending', 'sent', 'received', 'reviewed', 'approved');--> statement-breakpoint
ALTER TABLE "document_requests" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."document_request_status";--> statement-breakpoint
ALTER TABLE "document_requests" ALTER COLUMN "status" SET DATA TYPE "public"."document_request_status" USING "status"::"public"."document_request_status";--> statement-breakpoint
ALTER TABLE "ledger_events" ALTER COLUMN "actor_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "benchmarks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_records" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD COLUMN "framework" text;--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD COLUMN "assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "compliance_evidence" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document_requests" ADD COLUMN "requested_from_name" text;--> statement-breakpoint
ALTER TABLE "document_requests" ADD COLUMN "requested_from_email" text;--> statement-breakpoint
ALTER TABLE "document_requests" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "document_requests" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "size_bytes" bigint;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "uploaded_by" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "org_members" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orgs" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tax_deductions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "valuations" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "compliance_controls" ADD CONSTRAINT "compliance_controls_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;