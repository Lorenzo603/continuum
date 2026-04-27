ALTER TABLE "workspaces" ADD COLUMN "user_id" text;--> statement-breakpoint
UPDATE "workspaces" SET "user_id" = 'legacy-user' WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "streams" ADD COLUMN "user_id" text;--> statement-breakpoint
UPDATE "streams" s
SET "user_id" = w."user_id"
FROM "workspaces" w
WHERE s."workspace_id" = w."id" AND s."user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "streams" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "cards" ADD COLUMN "user_id" text;--> statement-breakpoint
UPDATE "cards" c
SET "user_id" = s."user_id"
FROM "streams" s
WHERE c."stream_id" = s."id" AND c."user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint

CREATE INDEX "workspaces_user_id_idx" ON "workspaces" ("user_id");--> statement-breakpoint
CREATE INDEX "streams_user_id_idx" ON "streams" ("user_id");--> statement-breakpoint
CREATE INDEX "cards_user_id_idx" ON "cards" ("user_id");