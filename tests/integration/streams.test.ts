/**
 * Integration tests for src/lib/streams.ts against the real local Postgres DB.
 * Fixtures: one dedicated workspace per test, deleted in afterEach.
 * No existing data is touched.
 */
import { describe, it, expect, afterEach, afterAll } from "vitest";
import {
  createStream,
  getTopLevelStreams,
  getSubstreams,
  getStreamByTitle,
  getStreamTree,
  reorderStreams,
  updateStream,
  archiveStream,
  unarchiveStream,
  getArchivedStreams,
} from "@/lib/streams";
import {
  createTestWorkspace,
  cleanupTestWorkspace,
  closeTestDb,
  type FixtureWorkspace,
} from "./helpers/fixtures";

let fixture: FixtureWorkspace;

describe("streams (integration)", () => {
  afterEach(async () => {
    if (fixture) await cleanupTestWorkspace(fixture);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("creates a top-level stream and lists it", async () => {
    fixture = await createTestWorkspace();
    const stream = await createStream({ title: "Workstream A", workspaceId: fixture.workspace.id }, fixture.userId);

    expect(stream).not.toBeNull();
    expect(stream.orderIndex).toBe(0);

    const top = await getTopLevelStreams(fixture.workspace.id, fixture.userId);
    expect(top.map((s: { id: string }) => s.id)).toContain(stream.id);
  });

  it("creates a nested substream and builds a nested tree", async () => {
    fixture = await createTestWorkspace();
    const parent = await createStream({ title: "Parent", workspaceId: fixture.workspace.id }, fixture.userId);
    const child = await createStream(
      { title: "Child", workspaceId: fixture.workspace.id, parentStreamId: parent.id },
      fixture.userId,
    );

    expect(child).not.toBeNull();

    const tree = await getStreamTree(fixture.workspace.id, fixture.userId);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(parent.id);
    expect(tree[0].children.map((c: { id: string }) => c.id)).toContain(child.id);
    expect(tree[0].children[0].depth).toBe(1);

    const subs = await getSubstreams(parent.id, fixture.userId);
    expect(subs.map((s: { id: string }) => s.id)).toContain(child.id);
  });

  it("insertAtStart shifts existing orderIndexes and places the new stream first", async () => {
    fixture = await createTestWorkspace();
    const first = await createStream({ title: "First", workspaceId: fixture.workspace.id }, fixture.userId);
    const second = await createStream({ title: "Second", workspaceId: fixture.workspace.id }, fixture.userId);

    const inserted = await createStream(
      { title: "Inserted", workspaceId: fixture.workspace.id, insertAtStart: true },
      fixture.userId,
    );

    expect(inserted.orderIndex).toBe(0);

    const top = await getTopLevelStreams(fixture.workspace.id, fixture.userId);
    expect(top.map((s: { id: string }) => s.id)).toEqual([inserted.id, first.id, second.id]);
  });

  it("returns null when creating a substream in a different workspace", async () => {
    fixture = await createTestWorkspace();
    const other = await createTestWorkspace();
    const parent = await createStream({ title: "Parent", workspaceId: fixture.workspace.id }, fixture.userId);

    const mismatched = await createStream(
      { title: "Bad", workspaceId: other.workspace.id, parentStreamId: parent.id },
      fixture.userId,
    );
    expect(mismatched).toBeNull();

    await cleanupTestWorkspace(other);
  });

  it("resolves a stream by title within a workspace", async () => {
    fixture = await createTestWorkspace();
    const stream = await createStream({ title: "Resolve Me", workspaceId: fixture.workspace.id }, fixture.userId);

    const resolved = await getStreamByTitle("Resolve Me", fixture.userId, fixture.workspace.id);
    expect(resolved?.id).toBe(stream.id);

    const missing = await getStreamByTitle("Does Not Exist", fixture.userId, fixture.workspace.id);
    expect(missing).toBeNull();
  });

  it("reorderStreams persists a new order", async () => {
    fixture = await createTestWorkspace();
    const a = await createStream({ title: "A", workspaceId: fixture.workspace.id }, fixture.userId);
    const b = await createStream({ title: "B", workspaceId: fixture.workspace.id }, fixture.userId);
    const c = await createStream({ title: "C", workspaceId: fixture.workspace.id }, fixture.userId);

    await reorderStreams([c.id, a.id, b.id], fixture.userId);

    const top = await getTopLevelStreams(fixture.workspace.id, fixture.userId);
    expect(top.map((s: { id: string }) => s.id)).toEqual([c.id, a.id, b.id]);
  });

  it("reorderStreams throws when an id is not owned", async () => {
    fixture = await createTestWorkspace();
    const a = await createStream({ title: "A", workspaceId: fixture.workspace.id }, fixture.userId);

    await expect(
      reorderStreams([a.id, "00000000-0000-0000-0000-000000000000"], fixture.userId),
    ).rejects.toThrow("Stream not found");
  });

  it("updates a stream title", async () => {
    fixture = await createTestWorkspace();
    const stream = await createStream({ title: "Before", workspaceId: fixture.workspace.id }, fixture.userId);

    const updated = await updateStream(stream.id, { title: "After" }, fixture.userId);
    expect(updated?.title).toBe("After");
  });

  it("archives a stream and all descendants, then unarchives them", async () => {
    fixture = await createTestWorkspace();
    const parent = await createStream({ title: "Parent", workspaceId: fixture.workspace.id }, fixture.userId);
    const child = await createStream(
      { title: "Child", workspaceId: fixture.workspace.id, parentStreamId: parent.id },
      fixture.userId,
    );

    const archived = await archiveStream(parent.id, fixture.userId);
    expect(archived?.status).toBe("archived");

    const archivedList = await getArchivedStreams(fixture.workspace.id, fixture.userId);
    expect(archivedList.map((s: { id: string }) => s.id)).toEqual([parent.id]); // only the top-level archived stream

    const tree = await getStreamTree(fixture.workspace.id, fixture.userId);
    expect(tree).toHaveLength(0);

    const unarchived = await unarchiveStream(parent.id, fixture.userId);
    expect(unarchived?.status).toBe("active");

    const treeAfter = await getStreamTree(fixture.workspace.id, fixture.userId);
    expect(treeAfter).toHaveLength(1);
    expect(treeAfter[0].children.map((c: { id: string }) => c.id)).toContain(child.id);
  });
});
