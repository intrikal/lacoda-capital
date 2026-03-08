CREATE TYPE "public"."policy_status" AS ENUM('active', 'expiring', 'expired', 'pending');--> statement-breakpoint
CREATE TYPE "public"."policy_type" AS ENUM('home', 'auto', 'life', 'umbrella', 'liability', 'health', 'business', 'property');--> statement-breakpoint
CREATE TYPE "public"."premium_frequency" AS ENUM('monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TABLE "insurance_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"policy_type" "policy_type" DEFAULT 'home' NOT NULL,
	"status" "policy_status" DEFAULT 'active' NOT NULL,
	"provider" text NOT NULL,
	"policy_number" text NOT NULL,
	"coverage_amount" double precision DEFAULT 0 NOT NULL,
	"deductible" double precision DEFAULT 0 NOT NULL,
	"premium" double precision DEFAULT 0 NOT NULL,
	"premium_frequency" "premium_frequency" DEFAULT 'annual' NOT NULL,
	"effective_date" text NOT NULL,
	"expiration_date" text NOT NULL,
	"covered_assets" jsonb DEFAULT '[]'::jsonb,
	"beneficiaries" jsonb DEFAULT '[]'::jsonb,
	"agent" jsonb DEFAULT 'null'::jsonb,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "insurance_policies_org_id_idx" ON "insurance_policies" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "insurance_policies_client_id_idx" ON "insurance_policies" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "insurance_policies_status_idx" ON "insurance_policies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "insurance_policies_policy_type_idx" ON "insurance_policies" USING btree ("policy_type");