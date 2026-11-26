/**
 * Integration tests for src/lib/cards.ts and src/lib/latestCards.ts against the
 * real local Postgres DB. Fixtures: one dedicated workspace per test, deleted
 * in afterEach. No existing data is touched.
 */
import { describe, it, expect, afterEach, afterAll } from "vitest";
import {
  createCard,
  getCards,
  getLatestCard,
  getCardById,
  updateCard,
  deleteCard,
} from "@/lib/cards";
import { getLatestCardsByWorkspace } from "@/lib/latestCards";
import { createStream } from "@/lib/streams";
import {
  createTestWorkspace,
  cleanupTestWorkspace,
  closeTestDb,
  type FixtureWorkspace,
} from "./helpers/fixtures";

let fixture: FixtureWorkspace;

async function makeStream(title: string) {
  const stream = await createStream({ title, workspaceId: fixture.workspace.id }, fixture.userId);
  if (!stream) throw new Error("fixture stream creation failed");
  return stream;
}

describe("cards & latestCards (integration)", () => {
  afterEach(async () => {
    if (fixture) await cleanupTestWorkspace(fixture);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("creates a v1 card marked editable", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");

    const card = await createCard({ streamId: stream.id, content: "first" }, fixture.userId);

    expect(card).not.toBeNull();
    expect(card.version).toBe(1);
    expect(card.isEditable).toBe(true);
  });

  it("creating a new card completes the previous editable card", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");

    const first = await createCard({ streamId: stream.id, content: "first" }, fixture.userId);
    const second = await createCard(
      { streamId: stream.id, content: "second", metadata: { status: "in-progress" } },
      fixture.userId,
    );

    expect(second.version).toBe(2);

    const updatedFirst = await getCardById(first.id, fixture.userId);
    expect(updatedFirst?.isEditable).toBe(false);
    expect(updatedFirst?.metadata?.status).toBe("completed");
  });

  it("updateCard edits the editable card and refuses non-editable cards", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const first = await createCard({ streamId: stream.id, content: "first" }, fixture.userId);

    const updated = await updateCard(first.id, fixture.userId, { content: "edited" });
    expect(updated.content).toBe("edited");

    const second = await createCard({ streamId: stream.id, content: "second" }, fixture.userId);
    await expect(
      updateCard(first.id, fixture.userId, { content: "too late" }),
    ).rejects.toThrow("Only the latest card can be edited");

    expect(second.version).toBe(2);
  });

  it("deleteCard removes the editable card and re-enables the previous one", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const first = await createCard({ streamId: stream.id, content: "first" }, fixture.userId);
    const second = await createCard({ streamId: stream.id, content: "second" }, fixture.userId);

    await deleteCard(second.id, fixture.userId);

    const remaining = await getCards(stream.id, fixture.userId);
    expect(remaining.map((c: { id: string }) => c.id)).toEqual([first.id]);
    const restored = await getCardById(first.id, fixture.userId);
    expect(restored?.isEditable).toBe(true);
  });

  it("deleteCard refuses to delete a non-editable card", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const first = await createCard({ streamId: stream.id, content: "first" }, fixture.userId);
    await createCard({ streamId: stream.id, content: "second" }, fixture.userId);

    await expect(deleteCard(first.id, fixture.userId)).rejects.toThrow("Only the latest card can be deleted");
  });

  it("getLatestCard returns the editable (newest) card", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    await createCard({ streamId: stream.id, content: "first" }, fixture.userId);
    const second = await createCard({ streamId: stream.id, content: "second" }, fixture.userId);

    const latest = await getLatestCard(stream.id, fixture.userId);
    expect(latest?.id).toBe(second.id);
  });

  it("getLatestCardsByWorkspace returns one entry per stream with a card", async () => {
    fixture = await createTestWorkspace();
    const s1 = await makeStream("Alpha");
    const s2 = await makeStream("Beta");

    const c1 = await createCard({ streamId: s1.id, content: "alpha card" }, fixture.userId);
    await createCard({ streamId: s2.id, content: "beta card v1" }, fixture.userId);
    const betaV2 = await createCard({ streamId: s2.id, content: "beta card v2" }, fixture.userId);

    const latest = await getLatestCardsByWorkspace(fixture.workspace.id, fixture.userId);
    expect(latest).toHaveLength(2);

    const byStream = new Map(latest.map((entry) => [entry.streamId, entry.latestCard]));
    expect(byStream.get(s1.id)?.id).toBe(c1.id);
    expect(byStream.get(s2.id)?.id).toBe(betaV2.id);

    // Ordering follows the stream tree order
    expect(latest.map((entry) => entry.streamId)).toEqual([s1.id, s2.id]);
  });

  it("getLatestCardsByWorkspace returns empty array when no cards exist", async () => {
    fixture = await createTestWorkspace();
    await makeStream("empty");

    const latest = await getLatestCardsByWorkspace(fixture.workspace.id, fixture.userId);
    expect(latest).toEqual([]);
  });
});
