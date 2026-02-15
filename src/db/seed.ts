import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { streams, cards } from "./schema";
import { v4 as uuid } from "uuid";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "continuum.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  db.delete(cards).run();
  db.delete(streams).run();

  // --- Stream 1: Product Development ---
  const stream1Id = uuid();
  db.insert(streams)
    .values({
      id: stream1Id,
      title: "Product Development",
      parentStreamId: null,
      orderIndex: 0,
    })
    .run();

  const card1_1 = uuid();
  db.insert(cards)
    .values({
      id: card1_1,
      streamId: stream1Id,
      content:
        "Initial product brainstorm: build a timeline-based task organizer that preserves history.",
      version: 1,
      isEditable: false,
      metadata: JSON.stringify({
        status: "completed",
        tags: ["planning"],
      }) as unknown as null,
    })
    .run();

  const card1_2 = uuid();
  db.insert(cards)
    .values({
      id: card1_2,
      streamId: stream1Id,
      content:
        "Refined the concept: streams as timelines, cards as immutable snapshots. Chose Next.js + Drizzle stack.",
      version: 2,
      isEditable: false,
      metadata: JSON.stringify({
        status: "completed",
        tags: ["planning", "architecture"],
      }) as unknown as null,
    })
    .run();

  const card1_3 = uuid();
  db.insert(cards)
    .values({
      id: card1_3,
      streamId: stream1Id,
      content:
        "MVP development in progress. Core data model and API routes implemented. UI components next.",
      version: 3,
      isEditable: true,
      metadata: JSON.stringify({
        status: "active",
        tags: ["development"],
      }) as unknown as null,
    })
    .run();

  // --- Substream 1a: Design System (child of Product Development) ---
  const stream1aId = uuid();
  db.insert(streams)
    .values({
      id: stream1aId,
      title: "Design System",
      parentStreamId: stream1Id,
      orderIndex: 0,
    })
    .run();

  const card1a_1 = uuid();
  db.insert(cards)
    .values({
      id: card1a_1,
      streamId: stream1aId,
      content:
        "Established color palette: slate/zinc for neutral tones, blue for primary actions, amber for warnings.",
      version: 1,
      isEditable: false,
    })
    .run();

  const card1a_2 = uuid();
  db.insert(cards)
    .values({
      id: card1a_2,
      streamId: stream1aId,
      content:
        "Card component design finalized: rounded-lg, border, shadow-sm. Responsive min-w-[280px].",
      version: 2,
      isEditable: true,
      metadata: JSON.stringify({
        status: "active",
        tags: ["ui", "design"],
      }) as unknown as null,
    })
    .run();

  // --- Stream 2: Learning Goals ---
  const stream2Id = uuid();
  db.insert(streams)
    .values({
      id: stream2Id,
      title: "Learning Goals",
      parentStreamId: null,
      orderIndex: 1,
    })
    .run();

  const card2_1 = uuid();
  db.insert(cards)
    .values({
      id: card2_1,
      streamId: stream2Id,
      content:
        "Q1 focus: deepen understanding of React Server Components and Next.js App Router patterns.",
      version: 1,
      isEditable: false,
      metadata: JSON.stringify({
        status: "completed",
        tags: ["learning", "react"],
      }) as unknown as null,
    })
    .run();

  const card2_2 = uuid();
  db.insert(cards)
    .values({
      id: card2_2,
      streamId: stream2Id,
      content:
        "Completed RSC deep dive. Now exploring Drizzle ORM patterns and database transaction strategies.",
      version: 2,
      isEditable: true,
      metadata: JSON.stringify({
        status: "active",
        tags: ["learning", "database"],
      }) as unknown as null,
    })
    .run();

  // --- Stream 3: Personal Projects ---
  const stream3Id = uuid();
  db.insert(streams)
    .values({
      id: stream3Id,
      title: "Personal Projects",
      parentStreamId: null,
      orderIndex: 2,
    })
    .run();

  const card3_1 = uuid();
  db.insert(cards)
    .values({
      id: card3_1,
      streamId: stream3Id,
      content: "Idea: build a CLI tool for managing dotfiles across machines.",
      version: 1,
      isEditable: false,
    })
    .run();

  const card3_2 = uuid();
  db.insert(cards)
    .values({
      id: card3_2,
      streamId: stream3Id,
      content:
        "Pivoted: focus on Continuum app first. The dotfiles tool can wait.",
      version: 2,
      isEditable: false,
    })
    .run();

  const card3_3 = uuid();
  db.insert(cards)
    .values({
      id: card3_3,
      streamId: stream3Id,
      content:
        "Added a home automation sub-project idea. Will create a substream for it later.",
      version: 3,
      isEditable: false,
    })
    .run();

  const card3_4 = uuid();
  db.insert(cards)
    .values({
      id: card3_4,
      streamId: stream3Id,
      content:
        "Continuum MVP nearly complete. Next: add drag-to-reorder for streams.",
      version: 4,
      isEditable: true,
      metadata: JSON.stringify({
        status: "active",
        tags: ["continuum"],
      }) as unknown as null,
    })
    .run();

  console.log("✅ Seeded:");
  console.log("   3 top-level streams + 1 substream");
  console.log("   11 cards total");

  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
