import { DATABASE_URL } from "./config";
import * as schema from "./schema";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Set it in your .env file.");
}

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * The Drizzle database instance backed by PostgreSQL (node-postgres).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = drizzle(pool, { schema });

/** The `workspaces` table. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workspaces: any = schema.workspaces;

/** The `streams` table. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const streams: any = schema.streams;

/** The `cards` table. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cards: any = schema.cards;

/** The `settings` table. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const settings: any = schema.settings;
