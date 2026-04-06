CREATE TYPE "public"."aml_status" AS ENUM('not_screened', 'clear', 'review', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('renovation', 'maintenance', 'capital_improvement', 'property_tax', 'insurance', 'management_fee', 'legal', 'financing', 'utilities', 'professional_services', 'marketing', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('pending', 'paid', 'overdue', 'disputed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('not_started', 'in_progress', 'approved', 'rejected', 'expired', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."kyc_tier" AS ENUM('standard', 'enhanced');--> statement-breakpoint
CREATE TYPE "public"."risk_alert_status" AS ENUM('normal', 'watch', 'breach', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."risk_tolerance" AS ENUM('conservative', 'moderate', 'aggressive', 'speculative');--> statement-breakpoint
ALTER TYPE "public"."ledger_action" ADD VALUE 'api_read';--> statement-breakpoint
ALTER TYPE "public"."ledger_action" ADD VALUE 'portal_accessed';--> statement-breakpoint
ALTER TYPE "public"."ledger_target_type" ADD VALUE 'stakeholder_portal';--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"entity_id" uuid,
	"asset_id" uuid,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"category" "expense_category" NOT NULL,
	"status" "expense_status" DEFAULT 'pending' NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"vendor" text,
	"invoice_number" text,
	"property_impact" text,
	"estimated_value_increase" numeric(18, 2),
	"refinance_related" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kyc_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"assigned_to" uuid,
	"status" "kyc_status" DEFAULT 'not_started' NOT NULL,
	"tier" "kyc_tier" DEFAULT 'standard' NOT NULL,
	"identity_verified" boolean DEFAULT false NOT NULL,
	"identity_verified_at" timestamp with time zone,
	"identity_document_type" text,
	"identity_document_expiry" timestamp with time zone,
	"beneficial_ownership_verified" boolean DEFAULT false NOT NULL,
	"beneficial_ownership_notes" text,
	"source_of_funds_verified" boolean DEFAULT false NOT NULL,
	"source_of_funds_description" text,
	"aml_status" "aml_status" DEFAULT 'not_screened' NOT NULL,
	"aml_screened_at" timestamp with time zone,
	"aml_risk_score" integer,
	"pep_status" boolean DEFAULT false NOT NULL,
	"sanctions_match" boolean DEFAULT false NOT NULL,
	"adverse_media_flag" boolean DEFAULT false NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"next_review_due" timestamp with time zone,
	"review_frequency_days" integer DEFAULT 365,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kyc_records_org_client_unique" UNIQUE("org_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "risk_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"reviewed_by" uuid,
	"risk_tolerance" "risk_tolerance" DEFAULT 'moderate' NOT NULL,
	"investment_horizon" text,
	"max_drawdown" numeric(5, 2),
	"alert_drawdown" numeric(5, 2),
	"current_drawdown" numeric(5, 2),
	"target_volatility" numeric(5, 2),
	"max_volatility" numeric(5, 2),
	"current_volatility" numeric(5, 2),
	"hedge_ratio" numeric(5, 2),
	"hedging_instruments" jsonb,
	"var_confidence_level" numeric(5, 2),
	"var_amount" numeric(18, 2),
	"var_horizon_days" integer,
	"alert_status" "risk_alert_status" DEFAULT 'normal' NOT NULL,
	"alert_notes" text,
	"last_reviewed_at" timestamp with time zone,
	"next_review_due" timestamp with time zone,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_profiles_org_client_unique" UNIQUE("org_id","client_id")
);
--> statement-breakpoint
ALTER TABLE "ledger_events" ALTER COLUMN "actor_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_records" ADD CONSTRAINT "kyc_records_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_records" ADD CONSTRAINT "kyc_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_records" ADD CONSTRAINT "kyc_records_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_profiles" ADD CONSTRAINT "risk_profiles_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_profiles" ADD CONSTRAINT "risk_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_profiles" ADD CONSTRAINT "risk_profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_org_id_idx" ON "expenses" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "expenses_asset_id_idx" ON "expenses" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "expenses_client_id_idx" ON "expenses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "kyc_records_org_id_idx" ON "kyc_records" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "kyc_records_client_id_idx" ON "kyc_records" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "kyc_records_status_idx" ON "kyc_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kyc_records_aml_status_idx" ON "kyc_records" USING btree ("aml_status");--> statement-breakpoint
CREATE INDEX "kyc_records_next_review_idx" ON "kyc_records" USING btree ("next_review_due");--> statement-breakpoint
CREATE INDEX "risk_profiles_org_id_idx" ON "risk_profiles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "risk_profiles_client_id_idx" ON "risk_profiles" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "risk_profiles_alert_status_idx" ON "risk_profiles" USING btree ("alert_status");