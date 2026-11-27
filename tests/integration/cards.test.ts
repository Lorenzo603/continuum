/**
 * Integration tests for src/lib/cards.ts, src/lib/cardLinks.ts and
 * src/lib/latestCards.ts against the real local Postgres DB.
 * Fixtures: one dedicated workspace per test, deleted in afterEach.
 * No existing data is touched.
 */
import { describe, it, expect, afterEach, afterAll } from "vitest";
import {
  createCard,
  getCards,
  getCardById,
  updateCard,
  deleteCard,
} from "@/lib/cards";
import {
  addCardLink,
  removeCardLink,
  getNextCards,
  getPreviousCards,
} from "@/lib/cardLinks";
import { getLeafCardsByWorkspace } from "@/lib/latestCards";
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

async function makeRootCard(streamId: string, content = "root") {
  const card = await createCard({ streamId, content }, fixture.userId);
  if (!card) throw new Error("root card creation failed");
  return card;
}

async function makeChildCard(streamId: string, sourceId: string, content: string) {
  const card = await createCard({ streamId, content, sourceCardId: sourceId }, fixture.userId);
  if (!card) throw new Error("child card creation failed");
  return card;
}

describe("cards & card links (integration)", () => {
  afterEach(async () => {
    if (fixture) await cleanupTestWorkspace(fixture);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("creates the root card without a sourceCardId", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");

    const card = await createCard({ streamId: stream.id, content: "first" }, fixture.userId);

    expect(card).not.toBeNull();
    expect(card!.isEditable).toBe(true);
    expect(card!.previousCards).toEqual([]);
    expect(card!.nextCards).toEqual([]);
  });

  it("rejects a non-root card without a sourceCardId", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    await makeRootCard(stream.id);

    await expect(
      createCard({ streamId: stream.id, content: "orphan" }, fixture.userId),
    ).rejects.toThrow("sourceCardId is required");
  });

  it("rejects a sourceCardId from another stream", async () => {
    fixture = await createTestWorkspace();
    const s1 = await makeStream("s1");
    const s2 = await makeStream("s2");
    const root = await makeRootCard(s1.id);

    await expect(
      createCard({ streamId: s2.id, content: "wrong stream", sourceCardId: root.id }, fixture.userId),
    ).rejects.toThrow("Source card must be in the same stream");
  });

  it("creates a child card linked to its source and completes the source", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);

    const child = await makeChildCard(stream.id, root.id, "second");

    expect(child.isEditable).toBe(true);
    expect(child.previousCards.map((c) => c.id)).toEqual([root.id]);

    const updatedRoot = await getCardById(root.id, fixture.userId);
    expect(updatedRoot?.isEditable).toBe(false);
    expect(updatedRoot?.metadata?.status).toBe("completed");
    expect(updatedRoot?.nextCards.map((c) => c.id)).toEqual([child.id]);
  });

  it("supports multiple editable cards (branches) in one stream", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const branchA = await makeChildCard(stream.id, root.id, "branch A");
    const branchB = await makeChildCard(stream.id, root.id, "branch B");

    const cards = await getCards(stream.id, fixture.userId);
    const editable = cards.filter((c) => c.isEditable).map((c) => c.id);
    expect(editable).toContain(branchA.id);
    expect(editable).toContain(branchB.id);
    expect(editable).not.toContain(root.id);
  });

  it("getNextCards/getPreviousCards mirror each other", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const child = await makeChildCard(stream.id, root.id, "second");

    const next = await getNextCards(root.id, fixture.userId);
    const previous = await getPreviousCards(child.id, fixture.userId);

    expect(next.map((c) => c.id)).toEqual([child.id]);
    expect(previous.map((c) => c.id)).toEqual([root.id]);
  });

  it("getNextCards returns all outgoing links ordered deterministically", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const branchA = await makeChildCard(stream.id, root.id, "branch A");
    const branchB = await makeChildCard(stream.id, root.id, "branch B");

    const next = await getNextCards(root.id, fixture.userId);
    expect(next.map((c) => c.id)).toContain(branchA.id);
    expect(next.map((c) => c.id)).toContain(branchB.id);
  });

  it("addCardLink creates a link between existing cards and marks the source completed", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const child = await makeChildCard(stream.id, root.id, "second");
    const third = await makeChildCard(stream.id, root.id, "third");

    // Diamond: root -> child, root -> third, then child -> third
    const updated = await addCardLink(child.id, third.id, fixture.userId);
    expect(updated.nextCards.map((c) => c.id)).toContain(third.id);

    const updatedChild = await getCardById(child.id, fixture.userId);
    expect(updatedChild?.isEditable).toBe(false);

    const updatedThird = await getCardById(third.id, fixture.userId);
    expect(updatedThird?.previousCards.map((c) => c.id).sort()).toEqual([root.id, child.id].sort());
  });

  it("addCardLink rejects self-links", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);

    await expect(addCardLink(root.id, root.id, fixture.userId)).rejects.toThrow("itself");
  });

  it("addCardLink rejects duplicate links", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const child = await makeChildCard(stream.id, root.id, "second");

    await expect(addCardLink(root.id, child.id, fixture.userId)).rejects.toThrow("already linked");
  });

  it("addCardLink rejects cross-stream links", async () => {
    fixture = await createTestWorkspace();
    const s1 = await makeStream("s1");
    const s2 = await makeStream("s2");
    const root = await makeRootCard(s1.id);
    const other = await makeRootCard(s2.id);

    await expect(addCardLink(root.id, other.id, fixture.userId)).rejects.toThrow("same stream");
  });

  it("addCardLink rejects cycles (target reaches source)", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const child = await makeChildCard(stream.id, root.id, "second");
    const grandchild = await makeChildCard(stream.id, child.id, "third");

    // grandchild can reach root (grandchild -> ... wait, outgoing edges are root->child->grandchild)
    // The new link child -> root would close root -> child -> root.
    // From target=root, can it reach source=child? root -> child -> grandchild: yes, child is reachable.
    await expect(addCardLink(child.id, root.id, fixture.userId)).rejects.toThrow("previous cards");

    // And grandchild -> child is also a cycle via the chain.
    await expect(addCardLink(grandchild.id, child.id, fixture.userId)).rejects.toThrow("previous cards");
  });

  it("addCardLink rejects cards owned by another user", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const otherUserId = `it-user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Another user can never create a stream in our workspace (ownership is
    // checked), so isolate with a dedicated workspace for the other user.
    const { createWorkspace } = await import("@/lib/workspaces");
    const otherWorkspace = await createWorkspace(
      { name: `it-workspace-${Date.now()}` },
      otherUserId,
    );
    if (!otherWorkspace) throw new Error("failed to create other workspace");
    const otherStream = await createStream({ title: "other", workspaceId: otherWorkspace.id }, otherUserId);
    if (!otherStream) throw new Error("failed to create other stream");
    const otherCard = await createCard({ streamId: otherStream.id, content: "other" }, otherUserId);
    if (!otherCard) throw new Error("failed to create other card");

    await expect(addCardLink(root.id, otherCard.id, fixture.userId)).rejects.toThrow("Target card not found");

    // Cleanup the other workspace (owned by the other user)
    const { deleteWorkspace } = await import("@/lib/workspaces");
    await deleteWorkspace(otherWorkspace.id, otherUserId);
  });

  it("removeCardLink removes the link and restores leaf status", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const child = await makeChildCard(stream.id, root.id, "second");

    await removeCardLink(root.id, child.id, fixture.userId);

    const updatedRoot = await getCardById(root.id, fixture.userId);
    expect(updatedRoot?.isEditable).toBe(true);
    expect(updatedRoot?.nextCards).toEqual([]);
    const updatedChild = await getCardById(child.id, fixture.userId);
    expect(updatedChild?.previousCards).toEqual([]);
  });

  it("removeCardLink is idempotent-ish: missing link throws 404", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const child = await makeChildCard(stream.id, root.id, "second");

    await removeCardLink(root.id, child.id, fixture.userId);
    await expect(removeCardLink(root.id, child.id, fixture.userId)).rejects.toThrow("Link not found");
  });

  it("deleteCard removes a leaf card and re-marks its parent editable", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const child = await makeChildCard(stream.id, root.id, "second");

    await deleteCard(child.id, fixture.userId);

    const remaining = await getCards(stream.id, fixture.userId);
    expect(remaining.map((c) => c.id)).toEqual([root.id]);
    const restored = await getCardById(root.id, fixture.userId);
    expect(restored?.isEditable).toBe(true);
  });

  it("deleteCard refuses to delete a card with outgoing links", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    await makeChildCard(stream.id, root.id, "second");

    await expect(deleteCard(root.id, fixture.userId)).rejects.toThrow("only leaf cards");
  });

  it("deleteCard keeps a branched source non-editable while siblings remain", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const branchA = await makeChildCard(stream.id, root.id, "branch A");
    const branchB = await makeChildCard(stream.id, root.id, "branch B");

    await deleteCard(branchA.id, fixture.userId);

    const updatedRoot = await getCardById(root.id, fixture.userId);
    expect(updatedRoot?.isEditable).toBe(false);

    await deleteCard(branchB.id, fixture.userId);
    const updatedRoot2 = await getCardById(root.id, fixture.userId);
    expect(updatedRoot2?.isEditable).toBe(true);
  });

  it("updateCard edits a leaf card and refuses non-leaf cards", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);

    const updated = await updateCard(root.id, fixture.userId, { content: "edited" });
    expect(updated.content).toBe("edited");

    const child = await makeChildCard(stream.id, root.id, "second");
    await expect(
      updateCard(root.id, fixture.userId, { content: "too late" }),
    ).rejects.toThrow("leaf");
    await expect(
      updateCard(child.id, fixture.userId, { content: "ok" }),
    ).resolves.toBeDefined();
  });

  it("getLeafCardsByWorkspace returns every leaf card in tree order", async () => {
    fixture = await createTestWorkspace();
    const s1 = await makeStream("Alpha");
    const s2 = await makeStream("Beta");

    const root1 = await makeRootCard(s1.id, "alpha root");
    const child1 = await makeChildCard(s1.id, root1.id, "alpha child");
    const root2 = await makeRootCard(s2.id, "beta root");

    const leaves = await getLeafCardsByWorkspace(fixture.workspace.id, fixture.userId);
    const byStream = new Map<string, string[]>();
    for (const entry of leaves) {
      const list = byStream.get(entry.streamId) ?? [];
      list.push(entry.card.id);
      byStream.set(entry.streamId, list);
    }

    expect(byStream.get(s1.id)).toEqual([child1.id]);
    expect(byStream.get(s2.id)).toEqual([root2.id]);
  });

  it("getCards returns cards with resolved previous/next arrays", async () => {
    fixture = await createTestWorkspace();
    const stream = await makeStream("s1");
    const root = await makeRootCard(stream.id);
    const child = await makeChildCard(stream.id, root.id, "second");

    const cards = await getCards(stream.id, fixture.userId);
    const rootCard = cards.find((c) => c.id === root.id);
    const childCard = cards.find((c) => c.id === child.id);

    expect(rootCard?.nextCards.map((c) => c.id)).toEqual([child.id]);
    expect(childCard?.previousCards.map((c) => c.id)).toEqual([root.id]);
  });
});
