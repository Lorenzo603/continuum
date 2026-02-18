import "dotenv/config";
import { DB_TYPE, SQLITE_PATH, DATABASE_URL } from "./config";
import { streams as sqliteStreams, cards as sqliteCards } from "./schema.sqlite";
import { streams as pgStreams, cards as pgCards } from "./schema.pg";
import { v4 as uuid } from "uuid";
import path from "path";

type StatusValue =
  | "completed"
  | "waiting"
  | "in-progress"
  | "action-required"
  | "monitor"
  | "to-update";

// ---------------------------------------------------------------------------
// Initialise db + table references for the active dialect
// ---------------------------------------------------------------------------

function createConnection(): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  streams: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cards: any;
  cleanup: () => void | Promise<void>;
} {
  if (DB_TYPE === "sqlite") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/better-sqlite3");

    const dbPath = path.resolve(process.cwd(), SQLITE_PATH);
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    return {
      db: drizzle(sqlite),
      streams: sqliteStreams,
      cards: sqliteCards,
      cleanup: () => sqlite.close(),
    };
  }

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
    db: drizzle(pool),
    streams: pgStreams,
    cards: pgCards,
    cleanup: () => pool.end(),
  };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`🌱 Seeding database (${DB_TYPE})...`);

  const { db, streams, cards, cleanup } = createConnection();

  // Clear existing data
  await db.delete(cards);
  await db.delete(streams);

  // Helper to insert a stream
  async function insertStream(
    title: string,
    orderIndex: number,
    parentStreamId: string | null = null,
  ) {
    const id = uuid();
    await db.insert(streams).values({ id, title, parentStreamId, orderIndex });
    return id;
  }

  // Helper to insert cards for a stream
  async function insertCards(
    streamId: string,
    items: { content: string; status?: StatusValue; tags?: string[] }[],
  ) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isLast = i === items.length - 1;
      await db.insert(cards).values({
        id: uuid(),
        streamId,
        content: item.content,
        version: i + 1,
        isEditable: isLast,
        metadata:
          item.status || item.tags
            ? { status: item.status, tags: item.tags }
            : null,
      });
    }
  }

  // --- Stream 1: 0 cards ---
  await insertStream("Empty Backlog", 0);

  // --- Stream 2: 1 card ---
  const s2 = await insertStream("Quick Note", 1);
  await insertCards(s2, [
    {
      content:
        "Remember to set up CI/CD pipeline for the staging environment.",
      status: "action-required",
      tags: ["devops"],
    },
  ]);

  // --- Stream 3: 2 cards ---
  const s3 = await insertStream("Blog Post Draft", 2);
  await insertCards(s3, [
    {
      content:
        "Outline: Introduction to immutable data patterns in frontend apps.",
      status: "completed",
      tags: ["writing"],
    },
    {
      content:
        "First draft complete. Need to add code examples and proofread.",
      status: "in-progress",
      tags: ["writing", "review"],
    },
  ]);

  // --- Stream 4: 4 cards ---
  const s4 = await insertStream("Product Development", 3);
  await insertCards(s4, [
    {
      content:
        "Initial product brainstorm: build a timeline-based task organizer that preserves history.",
      status: "completed",
      tags: ["planning"],
    },
    {
      content:
        "Refined the concept: streams as timelines, cards as immutable snapshots. Chose Next.js + Drizzle stack.",
      status: "completed",
      tags: ["planning", "architecture"],
    },
    {
      content:
        "MVP development in progress. Core data model and API routes implemented. UI components next.",
      status: "completed",
      tags: ["development"],
    },
    {
      content:
        "UI overhaul complete — dark mode, collapsed card stacks, drag-to-scroll. Polishing remaining edge cases.",
      status: "in-progress",
      tags: ["development", "ui"],
    },
  ]);

  // --- Stream 5: 7 cards ---
  const s5 = await insertStream("Learning Goals", 4);
  await insertCards(s5, [
    {
      content:
        "Q1 focus: deepen understanding of React Server Components and Next.js App Router patterns.",
      status: "completed",
      tags: ["learning", "react"],
    },
    {
      content:
        "Completed RSC deep dive. Now exploring Drizzle ORM patterns and database transaction strategies.",
      status: "completed",
      tags: ["learning", "database"],
    },
    {
      content:
        "Learned about optimistic updates with Zustand. Applied pattern to card creation flow.",
      status: "completed",
      tags: ["learning", "state"],
    },
    {
      content:
        "Studied CSS container queries and modern responsive design. Applied to card layout.",
      status: "completed",
      tags: ["learning", "css"],
    },
    {
      content:
        "Deep dive into SQLite WAL mode and concurrent access patterns for better-sqlite3.",
      status: "completed",
      tags: ["learning", "database"],
    },
    {
      content:
        "Explored Tailwind v4 changes: CSS-first config, new color system, @theme directive.",
      status: "completed",
      tags: ["learning", "css"],
    },
    {
      content:
        "Currently studying accessibility patterns for dynamic content — live regions, focus management, ARIA.",
      status: "monitor",
      tags: ["learning", "a11y"],
    },
  ]);

  // --- Stream 6: 10 cards ---
  const s6 = await insertStream("Personal Projects", 5);
  await insertCards(s6, [
    {
      content:
        "Idea: build a CLI tool for managing dotfiles across machines.",
    },
    {
      content:
        "Pivoted: focus on Continuum app first. The dotfiles tool can wait.",
    },
    {
      content:
        "Added a home automation sub-project idea. Will create a substream for it later.",
    },
    {
      content:
        "Sketched out a meal-planning app concept. Would use similar stream/card paradigm.",
      status: "completed",
      tags: ["ideas"],
    },
    {
      content:
        "Started experimenting with a Raycast extension for quick-capturing stream updates.",
      status: "completed",
      tags: ["tooling"],
    },
    {
      content:
        "Revisited the dotfiles CLI idea — found existing tools but none handle secrets well.",
      status: "completed",
      tags: ["ideas", "cli"],
    },
    {
      content:
        "Built a small prototype for encrypted dotfile sync using age encryption.",
      status: "completed",
      tags: ["cli", "security"],
    },
    {
      content:
        "Meal planner shelved. Focusing on Continuum and the dotfiles CLI for now.",
      status: "completed",
      tags: ["planning"],
    },
    {
      content:
        "Continuum MVP nearly complete. Next: add drag-to-reorder for streams.",
      status: "completed",
      tags: ["continuum"],
    },
    {
      content:
        "Exploring a browser extension to clip web content directly into Continuum streams.",
      status: "waiting",
      tags: ["continuum", "ideas"],
    },
  ]);

  const totalCards = 0 + 1 + 2 + 4 + 7 + 10;
  console.log("✅ Seeded:");
  console.log("   6 streams (0, 1, 2, 4, 7, 10 cards)");
  console.log(`   ${totalCards} cards total`);

  await cleanup();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
