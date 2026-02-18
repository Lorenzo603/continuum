export type DbType = "sqlite" | "postgres";

export const DB_TYPE: DbType =
  (process.env.DB_TYPE as DbType) || "sqlite";

export const SQLITE_PATH =
  process.env.SQLITE_PATH || "./continuum.db";

export const DATABASE_URL =
  process.env.DATABASE_URL || "";
