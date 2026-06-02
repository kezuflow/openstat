ALTER TABLE "trading_decisions" ADD COLUMN "external_decision_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "trading_decisions_project_external_idx" ON "trading_decisions" USING btree ("project_id","external_decision_id") WHERE "trading_decisions"."external_decision_id" IS NOT NULL;
