CREATE TYPE "public"."fill_status" AS ENUM('partial', 'filled', 'cancelled');--> statement-breakpoint
ALTER TABLE "fills" ADD COLUMN "status" "fill_status" DEFAULT 'filled' NOT NULL;