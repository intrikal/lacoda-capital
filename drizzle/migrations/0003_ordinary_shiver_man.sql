CREATE TYPE "public"."goal_category" AS ENUM('retirement', 'education', 'realestate', 'emergency', 'travel', 'vehicle', 'investment', 'custom');--> statement-breakpoint
CREATE TYPE "public"."goal_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('on_track', 'ahead', 'behind', 'completed');--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"category" "goal_category" DEFAULT 'custom' NOT NULL,
	"status" "goal_status" DEFAULT 'on_track' NOT NULL,
	"priority" "goal_priority" DEFAULT 'medium' NOT NULL,
	"target_amount" double precision NOT NULL,
	"current_amount" double precision DEFAULT 0 NOT NULL,
	"monthly_contribution" double precision DEFAULT 0 NOT NULL,
	"target_date" text NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_org_id_idx" ON "goals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "goals_client_id_idx" ON "goals" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goals_category_idx" ON "goals" USING btree ("category");