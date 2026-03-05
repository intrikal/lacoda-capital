CREATE TYPE "public"."deal_stage" AS ENUM('prospecting', 'due_diligence', 'negotiation', 'closed', 'active', 'exit_planning');--> statement-breakpoint
CREATE TYPE "public"."deal_type" AS ENUM('real_estate', 'private_equity', 'venture_capital', 'fixed_income');--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"stage" "deal_stage" DEFAULT 'prospecting' NOT NULL,
	"type" "deal_type" NOT NULL,
	"potential_value" double precision DEFAULT 0 NOT NULL,
	"probability" integer DEFAULT 50 NOT NULL,
	"assigned_to" uuid,
	"assignee_name" text,
	"due_date" text,
	"notes" text,
	"last_activity" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deals_org_id_idx" ON "deals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "deals_client_id_idx" ON "deals" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "deals_assigned_to_idx" ON "deals" USING btree ("assigned_to");