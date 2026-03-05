CREATE TYPE "public"."benchmark_category" AS ENUM('index', 'etf', 'mutual_fund', 'custom');--> statement-breakpoint
CREATE TABLE "benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"symbol" text,
	"category" "benchmark_category" DEFAULT 'index' NOT NULL,
	"ytd_return" double precision DEFAULT 0 NOT NULL,
	"alpha" double precision DEFAULT 0 NOT NULL,
	"beta" double precision DEFAULT 1 NOT NULL,
	"sharpe_ratio" double precision DEFAULT 0 NOT NULL,
	"volatility" double precision DEFAULT 0 NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmarks" ADD CONSTRAINT "benchmarks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "benchmarks_org_id_idx" ON "benchmarks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "benchmarks_client_id_idx" ON "benchmarks" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "benchmarks_category_idx" ON "benchmarks" USING btree ("category");