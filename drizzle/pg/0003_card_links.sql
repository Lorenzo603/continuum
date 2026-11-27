-- Convert the implicit sequential version model into an explicit many-to-many
-- next/previous link model between cards.
-- Ordering within this file matters: the link seeding reads the `version`
-- column, so it must run BEFORE the column (and its index) is dropped.
--> statement-breakpoint
CREATE TABLE "card_links" (
  "id" text PRIMARY KEY NOT NULL,
  "source_card_id" text NOT NULL REFERENCES "cards"("id") ON DELETE CASCADE,
  "target_card_id" text NOT NULL REFERENCES "cards"("id") ON DELETE CASCADE,
  "created_at" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "card_links_source_target_idx" ON "card_links" ("source_card_id", "target_card_id");
--> statement-breakpoint
CREATE INDEX "card_links_target_idx" ON "card_links" ("target_card_id");
--> statement-breakpoint
-- Seed one link per consecutive pair of cards, ordered by `version` ascending,
-- within each stream. ON CONFLICT DO NOTHING keeps the seed idempotent.
-- The link's created_at is pinned to the target card's created_at so the
-- history remains deterministic.
INSERT INTO "card_links" ("id", "source_card_id", "target_card_id", "created_at")
SELECT
  gen_random_uuid()::text AS "id",
  current."id" AS "source_card_id",
  next."id" AS "target_card_id",
  next."created_at" AS "created_at"
FROM (
  SELECT
    "id",
    "stream_id",
    "created_at",
    ROW_NUMBER() OVER (PARTITION BY "stream_id" ORDER BY "version" ASC, "id" ASC) AS "rn"
  FROM "cards"
) current
JOIN (
  SELECT
    "id",
    "stream_id",
    "created_at",
    ROW_NUMBER() OVER (PARTITION BY "stream_id" ORDER BY "version" ASC, "id" ASC) AS "rn"
  FROM "cards"
) next
  ON next."stream_id" = current."stream_id"
  AND next."rn" = current."rn" + 1
ON CONFLICT ("source_card_id", "target_card_id") DO NOTHING;
--> statement-breakpoint
DROP INDEX "stream_version_idx";
--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "version";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cards_stream_id_idx" ON "cards" ("stream_id");
