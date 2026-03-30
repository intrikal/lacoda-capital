CREATE TYPE "public"."beneficiary_designation" AS ENUM('primary', 'contingent');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'processing', 'completed', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."transfer_type" AS ENUM('deposit', 'withdrawal', 'transfer');--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"designation" "beneficiary_designation" NOT NULL,
	"percentage" double precision DEFAULT 0 NOT NULL,
	"accounts" jsonb DEFAULT '[]'::jsonb,
	"ssn_last4" text,
	"date_of_birth" text,
	"phone" text,
	"email" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"type" "transfer_type" NOT NULL,
	"amount" double precision NOT NULL,
	"from_account" text NOT NULL,
	"to_account" text NOT NULL,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"frequency" text DEFAULT 'One-time' NOT NULL,
	"reference" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beneficiaries_org_id_idx" ON "beneficiaries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "beneficiaries_client_id_idx" ON "beneficiaries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "beneficiaries_designation_idx" ON "beneficiaries" USING btree ("designation");--> statement-breakpoint
CREATE INDEX "transfers_org_id_idx" ON "transfers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "transfers_client_id_idx" ON "transfers" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "transfers_status_idx" ON "transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transfers_type_idx" ON "transfers" USING btree ("type");