ALTER TABLE "workspaces" ADD COLUMN "order_index" integer NOT NULL DEFAULT 0;--> statement-breakpoint
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at", "id") - 1 AS "next_order"
  FROM "workspaces"
)
UPDATE "workspaces" w
SET "order_index" = r."next_order"
FROM ranked r
WHERE w."id" = r."id";