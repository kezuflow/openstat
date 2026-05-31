CREATE TYPE "public"."chain_receipt_status" AS ENUM('submitted', 'confirmed', 'reverted');--> statement-breakpoint
CREATE TABLE "audit_anchors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"agent_id" uuid,
	"audit_insight_id" uuid,
	"external_run_id" text NOT NULL,
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"transaction_hash" text NOT NULL,
	"submitter_address" text NOT NULL,
	"telemetry_digest" text NOT NULL,
	"insight_digest" text NOT NULL,
	"outcome" integer NOT NULL,
	"block_number" text NOT NULL,
	"log_index" integer NOT NULL,
	"explorer_url" text NOT NULL,
	"anchored_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"agent_id" uuid,
	"chain_transaction_id" uuid,
	"external_run_id" text NOT NULL,
	"provider" text,
	"model" text,
	"verdict" text NOT NULL,
	"risk_score" integer NOT NULL,
	"summary" text NOT NULL,
	"anomaly_flags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"telemetry_digest" text NOT NULL,
	"insight_digest" text NOT NULL,
	"analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_index_cursors" (
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"event_topic" text NOT NULL,
	"last_indexed_block" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_index_cursors_chain_id_contract_address_event_topic_pk" PRIMARY KEY("chain_id","contract_address","event_topic")
);
--> statement-breakpoint
CREATE TABLE "chain_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"agent_id" uuid,
	"event_id" uuid,
	"external_run_id" text,
	"chain" text NOT NULL,
	"chain_id" integer NOT NULL,
	"transaction_hash" text NOT NULL,
	"action" text,
	"status" "chain_receipt_status" DEFAULT 'submitted' NOT NULL,
	"from_address" text,
	"to_address" text,
	"block_number" text,
	"gas_used" text,
	"explorer_url" text,
	"receipt" jsonb,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_anchors" ADD CONSTRAINT "audit_anchors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_anchors" ADD CONSTRAINT "audit_anchors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_anchors" ADD CONSTRAINT "audit_anchors_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_anchors" ADD CONSTRAINT "audit_anchors_audit_insight_id_audit_insights_id_fk" FOREIGN KEY ("audit_insight_id") REFERENCES "public"."audit_insights"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_anchors" ADD CONSTRAINT "audit_anchors_project_scope_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."projects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_insights" ADD CONSTRAINT "audit_insights_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_insights" ADD CONSTRAINT "audit_insights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_insights" ADD CONSTRAINT "audit_insights_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_insights" ADD CONSTRAINT "audit_insights_chain_transaction_id_chain_transactions_id_fk" FOREIGN KEY ("chain_transaction_id") REFERENCES "public"."chain_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_insights" ADD CONSTRAINT "audit_insights_project_scope_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."projects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_transactions" ADD CONSTRAINT "chain_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_transactions" ADD CONSTRAINT "chain_transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_transactions" ADD CONSTRAINT "chain_transactions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_transactions" ADD CONSTRAINT "chain_transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_transactions" ADD CONSTRAINT "chain_transactions_project_scope_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."projects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_anchors_chain_contract_tx_log_idx" ON "audit_anchors" USING btree ("chain_id","contract_address","transaction_hash","log_index");--> statement-breakpoint
CREATE INDEX "audit_anchors_project_run_idx" ON "audit_anchors" USING btree ("project_id","external_run_id");--> statement-breakpoint
CREATE INDEX "audit_insights_project_run_created_idx" ON "audit_insights" USING btree ("project_id","external_run_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chain_transactions_project_chain_hash_idx" ON "chain_transactions" USING btree ("project_id","chain_id","transaction_hash");--> statement-breakpoint
CREATE INDEX "chain_transactions_status_checked_idx" ON "chain_transactions" USING btree ("status","last_checked_at");--> statement-breakpoint
CREATE INDEX "chain_transactions_project_run_idx" ON "chain_transactions" USING btree ("project_id","external_run_id");