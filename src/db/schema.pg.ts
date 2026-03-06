import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const streams = pgTable("streams", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  parentStreamId: text("parent_stream_id").references(
    (): AnyPgColumn => streams.id,
    { onDelete: "cascade" },
  ),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(),
    streamId: text("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    version: integer("version").notNull().default(1),
    isEditable: boolean("is_editable").notNull().default(true),
    metadata: jsonb("metadata").$type<{
      tags?: string[];
      dueDate?: string;
      status?:
        | "completed"
        | "waiting"
        | "in-progress"
        | "action-required"
        | "monitor"
        | "to-update"
        | "backlog";
    } | null>(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("stream_version_idx").on(table.streamId, table.version),
  ],
);
