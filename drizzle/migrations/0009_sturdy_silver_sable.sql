CREATE TYPE "public"."billing_status" AS ENUM('paid', 'upcoming', 'due');--> statement-breakpoint
CREATE TABLE "billing_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"period" text NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"aum" double precision DEFAULT 0 NOT NULL,
	"status" "billing_status" DEFAULT 'upcoming' NOT NULL,
	"due_date" text NOT NULL,
	"paid_date" text,
	"effective_rate" double precision DEFAULT 0 NOT NULL,
	"description" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_records_org_id_idx" ON "billing_records" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "billing_records_client_id_idx" ON "billing_records" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "billing_records_status_idx" ON "billing_records" USING btree ("status");