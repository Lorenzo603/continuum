import { DB_TYPE, SQLITE_PATH, DATABASE_URL } from "./config";
import * as sqliteSchema from "./schema.sqlite";
import * as pgSchema from "./schema.pg";

// ---------------------------------------------------------------------------
// Initialise the correct Drizzle database instance based on DB_TYPE
// ---------------------------------------------------------------------------

function initSqlite() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const path = require("path") as typeof import("path");

  const dbPath = path.resolve(process.cwd(), SQLITE_PATH);
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return {
    db: drizzle(sqlite, { schema: sqliteSchema }),
    streams: sqliteSchema.streams,
    cards: sqliteSchema.cards,
  };
}

function initPostgres() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/node-postgres");

  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required when DB_TYPE=postgres. Set it in your .env file.",
    );
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  return {
    db: drizzle(pool, { schema: pgSchema }),
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

/** The `streams` table for the active dialect. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const streams: any = instance.streams;

/** The `cards` table for the active dialect. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cards: any = instance.cards;

export { DB_TYPE };
