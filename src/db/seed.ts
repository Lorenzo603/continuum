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

  // Helper to insert a stream
  function insertStream(title: string, orderIndex: number, parentStreamId: string | null = null) {
    const id = uuid();
    db.insert(streams).values({ id, title, parentStreamId, orderIndex }).run();
    return id;
  }

  // Helper to insert cards for a stream
  function insertCards(
    streamId: string,
    items: { content: string; status?: string; tags?: string[] }[],
  ) {
    items.forEach((item, i) => {
      const isLast = i === items.length - 1;
      db.insert(cards)
        .values({
          id: uuid(),
          streamId,
          content: item.content,
          version: i + 1,
          isEditable: isLast,
          metadata:
            item.status || item.tags
              ? (JSON.stringify({
                  status: item.status,
                  tags: item.tags,
                }) as unknown as null)
              : null,
        })
        .run();
    });
  }

  // --- Stream 1: 0 cards ---
  insertStream("Empty Backlog", 0);

  // --- Stream 2: 1 card ---
  const s2 = insertStream("Quick Note", 1);
  insertCards(s2, [
    { content: "Remember to set up CI/CD pipeline for the staging environment.", status: "active", tags: ["devops"] },
  ]);

  // --- Stream 3: 2 cards ---
  const s3 = insertStream("Blog Post Draft", 2);
  insertCards(s3, [
    { content: "Outline: Introduction to immutable data patterns in frontend apps.", status: "completed", tags: ["writing"] },
    { content: "First draft complete. Need to add code examples and proofread.", status: "active", tags: ["writing", "review"] },
  ]);

  // --- Stream 4: 4 cards ---
  const s4 = insertStream("Product Development", 3);
  insertCards(s4, [
    { content: "Initial product brainstorm: build a timeline-based task organizer that preserves history.", status: "completed", tags: ["planning"] },
    { content: "Refined the concept: streams as timelines, cards as immutable snapshots. Chose Next.js + Drizzle stack.", status: "completed", tags: ["planning", "architecture"] },
    { content: "MVP development in progress. Core data model and API routes implemented. UI components next.", status: "completed", tags: ["development"] },
    { content: "UI overhaul complete — dark mode, collapsed card stacks, drag-to-scroll. Polishing remaining edge cases.", status: "active", tags: ["development", "ui"] },
  ]);

  // --- Stream 5: 7 cards ---
  const s5 = insertStream("Learning Goals", 4);
  insertCards(s5, [
    { content: "Q1 focus: deepen understanding of React Server Components and Next.js App Router patterns.", status: "completed", tags: ["learning", "react"] },
    { content: "Completed RSC deep dive. Now exploring Drizzle ORM patterns and database transaction strategies.", status: "completed", tags: ["learning", "database"] },
    { content: "Learned about optimistic updates with Zustand. Applied pattern to card creation flow.", status: "completed", tags: ["learning", "state"] },
    { content: "Studied CSS container queries and modern responsive design. Applied to card layout.", status: "completed", tags: ["learning", "css"] },
    { content: "Deep dive into SQLite WAL mode and concurrent access patterns for better-sqlite3.", status: "completed", tags: ["learning", "database"] },
    { content: "Explored Tailwind v4 changes: CSS-first config, new color system, @theme directive.", status: "completed", tags: ["learning", "css"] },
    { content: "Currently studying accessibility patterns for dynamic content — live regions, focus management, ARIA.", status: "active", tags: ["learning", "a11y"] },
  ]);

  // --- Stream 6: 10 cards ---
  const s6 = insertStream("Personal Projects", 5);
  insertCards(s6, [
    { content: "Idea: build a CLI tool for managing dotfiles across machines." },
    { content: "Pivoted: focus on Continuum app first. The dotfiles tool can wait." },
    { content: "Added a home automation sub-project idea. Will create a substream for it later." },
    { content: "Sketched out a meal-planning app concept. Would use similar stream/card paradigm.", status: "completed", tags: ["ideas"] },
    { content: "Started experimenting with a Raycast extension for quick-capturing stream updates.", status: "completed", tags: ["tooling"] },
    { content: "Revisited the dotfiles CLI idea — found existing tools but none handle secrets well.", status: "completed", tags: ["ideas", "cli"] },
    { content: "Built a small prototype for encrypted dotfile sync using age encryption.", status: "completed", tags: ["cli", "security"] },
    { content: "Meal planner shelved. Focusing on Continuum and the dotfiles CLI for now.", status: "completed", tags: ["planning"] },
    { content: "Continuum MVP nearly complete. Next: add drag-to-reorder for streams.", status: "completed", tags: ["continuum"] },
    { content: "Exploring a browser extension to clip web content directly into Continuum streams.", status: "active", tags: ["continuum", "ideas"] },
  ]);

  const totalCards = 0 + 1 + 2 + 4 + 7 + 10;
  console.log("✅ Seeded:");
  console.log("   6 streams (0, 1, 2, 4, 7, 10 cards)");
  console.log(`   ${totalCards} cards total`);

  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
