import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const streams = sqliteTable("streams", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  parentStreamId: text("parent_stream_id").references((): ReturnType<typeof text> => streams.id, {
    onDelete: "cascade",
  }),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    streamId: text("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    version: integer("version").notNull().default(1),
    isEditable: integer("is_editable", { mode: "boolean" }).notNull().default(true),
    metadata: text("metadata", { mode: "json" }).$type<{
      tags?: string[];
      dueDate?: string;
      status?: "completed" | "waiting" | "in-progress" | "action-required" | "monitor";
    } | null>(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("stream_version_idx").on(table.streamId, table.version),
  ]
);
