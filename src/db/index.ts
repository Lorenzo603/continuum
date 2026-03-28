import { DB_TYPE, SQLITE_PATH, DATABASE_URL } from "./config";
import * as sqliteSchema from "./schema.sqlite";
import * as pgSchema from "./schema.pg";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { Pool } from "pg";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import path from "path";

// ---------------------------------------------------------------------------
// Initialise the correct Drizzle database instance based on DB_TYPE
// ---------------------------------------------------------------------------

function initSqlite() {
  const dbPath = path.resolve(process.cwd(), SQLITE_PATH);
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return {
    db: drizzleSqlite(sqlite, { schema: sqliteSchema }),
    workspaces: sqliteSchema.workspaces,
    streams: sqliteSchema.streams,
    cards: sqliteSchema.cards,
  };
}

function initPostgres() {
  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required when DB_TYPE=postgres. Set it in your .env file.",
    );
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  return {
    db: drizzlePostgres(pool, { schema: pgSchema }),
    workspaces: pgSchema.workspaces,
    streams: pgSchema.streams,
    cards: pgSchema.cards,
  };
}

const instance = DB_TYPE === "sqlite" ? initSqlite() : initPostgres();

/**
 * The Drizzle database instance — either better-sqlite3 or node-postgres,
 * configured via `DB_TYPE` in .env.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = instance.db;

/** The `workspaces` table for the active dialect. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workspaces: any = instance.workspaces;

/** The `streams` table for the active dialect. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const streams: any = instance.streams;

/** The `cards` table for the active dialect. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cards: any = instance.cards;

export { DB_TYPE };
