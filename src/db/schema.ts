import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const streams = pgTable("streams", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  parentStreamId: text("parent_stream_id").references(
    (): AnyPgColumn => streams.id,
    { onDelete: "cascade" },
  ),
  orderIndex: integer("order_index").notNull().default(0),
  status: text("status").notNull().default("active"),
  archivedAt: text("archived_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    streamId: text("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
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
  (table) => [index("cards_stream_id_idx").on(table.streamId)],
);

export const cardLinks = pgTable(
  "card_links",
  {
    id: text("id").primaryKey(),
    sourceCardId: text("source_card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    targetCardId: text("target_card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("card_links_source_target_idx").on(table.sourceCardId, table.targetCardId),
    index("card_links_target_idx").on(table.targetCardId),
  ],
);

export const settings = pgTable(
  "settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    prepopulateCardContent: boolean("prepopulate_card_content")
      .notNull()
      .default(true),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [uniqueIndex("settings_user_id_idx").on(table.userId)],
);
