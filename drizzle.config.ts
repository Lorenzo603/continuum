import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const DB_TYPE = process.env.DB_TYPE || "sqlite";

export default defineConfig(
  DB_TYPE === "sqlite"
    ? {
        schema: "./src/db/schema.sqlite.ts",
        out: "./drizzle/sqlite",
        dialect: "sqlite",
        dbCredentials: {
          url: process.env.SQLITE_PATH || "./continuum.db",
        },
      }
    : {
        schema: "./src/db/schema.pg.ts",
        out: "./drizzle/pg",
        dialect: "postgresql",
        dbCredentials: {
          url: process.env.DATABASE_URL!,
        },
      },
);
