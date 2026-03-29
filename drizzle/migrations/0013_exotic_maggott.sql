CREATE TYPE "public"."capital_event_status" AS ENUM('pending', 'paid', 'received', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."capital_event_type" AS ENUM('capital_call', 'distribution', 'recallable');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'cancelling', 'cancelled', 'unpaid');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'capital_call_due' BEFORE 'system';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'capital_call_overdue' BEFORE 'system';--> statement-breakpoint
CREATE TABLE "ai_call_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"agent_type" text NOT NULL,
	"input_hash" text NOT NULL,
	"input_summary" text,
	"output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"latency_ms" integer NOT NULL,
	"model_version" text NOT NULL,
	"token_count" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_estimate" numeric(10, 4),
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"actor_user_id" uuid,
	"target_id" text,
	"target_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"request_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "capital_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"event_type" "capital_event_type" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone,
	"status" "capital_event_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"confirmation_sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"effective_date" timestamp with time zone NOT NULL,
	"source" text DEFAULT 'manual',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saml_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"provider_type" text DEFAULT 'custom' NOT NULL,
	"domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata_url" text,
	"metadata_xml" text,
	"entity_id" text,
	"sso_url" text,
	"certificate" text,
	"attribute_mapping" jsonb DEFAULT '{"email":"email","name":"displayName","groups":"groups"}'::jsonb NOT NULL,
	"group_role_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_role" text DEFAULT 'client' NOT NULL,
	"enforced" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakeholder_portals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"visibility" jsonb DEFAULT '{"assets":true,"documents":false,"reports":false,"entities":true,"valuations":true}'::jsonb NOT NULL,
	"created_by" uuid,
	"enabled" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stakeholder_portals_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" text DEFAULT 'false',
	"trial_end" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."integration_provider";--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('stripe', 'plaid', 'docusign', 'quickbooks', 'google_drive', 'google_calendar', 'dropbox', 'salesforce', 'other');--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "provider" SET DATA TYPE "public"."integration_provider" USING "provider"::"public"."integration_provider";--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "committed_capital" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "called_capital_cached" numeric(18, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "distributed_cached" numeric(18, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "ai_call_log" ADD CONSTRAINT "ai_call_log_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_call_log" ADD CONSTRAINT "ai_call_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_events" ADD CONSTRAINT "capital_events_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_events" ADD CONSTRAINT "capital_events_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_events" ADD CONSTRAINT "capital_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saml_providers" ADD CONSTRAINT "saml_providers_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_portals" ADD CONSTRAINT "stakeholder_portals_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_portals" ADD CONSTRAINT "stakeholder_portals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_portals" ADD CONSTRAINT "stakeholder_portals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_call_log_org_id_idx" ON "ai_call_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ai_call_log_created_at_idx" ON "ai_call_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_call_log_agent_type_idx" ON "ai_call_log" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "ai_call_log_input_hash_idx" ON "ai_call_log" USING btree ("input_hash");--> statement-breakpoint
CREATE INDEX "api_keys_org_id_idx" ON "api_keys" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_created_by_idx" ON "api_keys" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "capital_events_asset_id_idx" ON "capital_events" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "capital_events_org_id_idx" ON "capital_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "capital_events_status_idx" ON "capital_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "capital_events_event_date_idx" ON "capital_events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "deletion_requests_user_id_idx" ON "deletion_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deletion_requests_scheduled_for_idx" ON "deletion_requests" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "exchange_rates_org_id_idx" ON "exchange_rates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "exchange_rates_pair_date_idx" ON "exchange_rates" USING btree ("from_currency","to_currency","effective_date");--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_rates_unique_pair_date_idx" ON "exchange_rates" USING btree ("org_id","from_currency","to_currency","effective_date");--> statement-breakpoint
CREATE INDEX "saml_providers_org_id_idx" ON "saml_providers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "saml_providers_domains_idx" ON "saml_providers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "stakeholder_portals_org_id_idx" ON "stakeholder_portals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "stakeholder_portals_client_id_idx" ON "stakeholder_portals" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "stakeholder_portals_token_idx" ON "stakeholder_portals" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_id_idx" ON "subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "entities_parent_id_idx" ON "entities" USING btree ("parent_id");