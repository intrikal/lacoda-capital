CREATE TYPE "public"."tax_deduction_category" AS ENUM('home_office', 'vehicle', 'travel', 'equipment', 'professional', 'education', 'healthcare', 'meals', 'utilities', 'charitable', 'retirement', 'taxes', 'other');--> statement-breakpoint
CREATE TYPE "public"."tax_deduction_status" AS ENUM('eligible', 'pending_review', 'claimed', 'ineligible');--> statement-breakpoint
CREATE TYPE "public"."tax_deduction_type" AS ENUM('personal', 'business');--> statement-breakpoint
CREATE TABLE "tax_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "tax_deduction_category" DEFAULT 'other' NOT NULL,
	"type" "tax_deduction_type" DEFAULT 'personal' NOT NULL,
	"status" "tax_deduction_status" DEFAULT 'eligible' NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"estimated_savings" double precision DEFAULT 0 NOT NULL,
	"tax_year" text NOT NULL,
	"description" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tax_deductions" ADD CONSTRAINT "tax_deductions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_deductions" ADD CONSTRAINT "tax_deductions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tax_deductions_org_id_idx" ON "tax_deductions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tax_deductions_client_id_idx" ON "tax_deductions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "tax_deductions_status_idx" ON "tax_deductions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tax_deductions_category_idx" ON "tax_deductions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tax_deductions_tax_year_idx" ON "tax_deductions" USING btree ("tax_year");