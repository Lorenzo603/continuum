ALTER TABLE "streams" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "archived_at" text;