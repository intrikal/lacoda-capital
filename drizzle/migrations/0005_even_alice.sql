CREATE TYPE "public"."calendar_event_type" AS ENUM('meeting', 'payment', 'dividend', 'deadline', 'document', 'call');--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"title" text NOT NULL,
	"type" "calendar_event_type" DEFAULT 'meeting' NOT NULL,
	"date" text NOT NULL,
	"time" text,
	"end_time" text,
	"location" text,
	"amount" double precision,
	"description" text,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"reminder" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_org_id_idx" ON "calendar_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "calendar_events_client_id_idx" ON "calendar_events" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "calendar_events_date_idx" ON "calendar_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "calendar_events_type_idx" ON "calendar_events" USING btree ("type");