/**
 * Unit tests for src/stores/streamStore.ts — tree helpers exercised through
 * public store actions with a mocked fetch (no network, no DB).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useStreamStore } from "@/stores/streamStore";
import { useUIStore } from "@/stores/uiStore";
import type { StreamNode } from "@/types";

function node(id: string, title: string, orderIndex: number, children: StreamNode[] = [], parentStreamId: string | null = null): StreamNode {
  return {
    id,
    userId: "user-1",
    title,
    workspaceId: "ws-1",
    parentStreamId,
    orderIndex,
    status: "active",
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    depth: 0,
    children,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function sampleTree(): StreamNode[] {
  return [
    node("a", "Alpha", 0, [node("a1", "Alpha 1", 0), node("a2", "Alpha 2", 1)]),
    node("b", "Beta", 1),
  ];
}

describe("useStreamStore", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    useStreamStore.setState({
      streams: [],
      archivedStreams: [],
      currentWorkspaceId: "ws-1",
      loading: false,
      error: null,
      authRequired: false,
    });
    useUIStore.setState({ expandedStreams: new Set(), cardEditorModal: null, statusFilters: new Set() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updateStream renames a node optimistically and reverts on failure", async () => {
    useStreamStore.setState({ streams: sampleTree() });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));

    await useStreamStore.getState().updateStream("a1", { title: "Renamed" });

    const state = useStreamStore.getState();
    expect(state.streams[0].children[0].title).toBe("Alpha 1"); // reverted
    expect(state.error).toBe("Failed to update stream");
  });

  it("updateStream renames nested node and keeps other nodes intact on success", async () => {
    useStreamStore.setState({ streams: sampleTree() });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { id: "a1", title: "Renamed" }));

    await useStreamStore.getState().updateStream("a1", { title: "Renamed" });

    const tree = useStreamStore.getState().streams;
    expect(tree[0].children[0].title).toBe("Renamed");
    expect(tree[0].children[1].title).toBe("Alpha 2");
    expect(tree[1].title).toBe("Beta");
  });

  it("deleteStream optimistically removes a node and reverts on failure", async () => {
    useStreamStore.setState({ streams: sampleTree() });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));

    await useStreamStore.getState().deleteStream("a2");

    const tree = useStreamStore.getState().streams;
    expect(tree[0].children.map((c) => c.id)).toEqual(["a1", "a2"]); // reverted
  });

  it("deleteStream removes a top-level node on success", async () => {
    useStreamStore.setState({ streams: sampleTree() });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, {}));

    await useStreamStore.getState().deleteStream("b");

    const tree = useStreamStore.getState().streams;
    expect(tree.map((n) => n.id)).toEqual(["a"]);
  });

  it("reorderStreams reorders top-level nodes and renumbers orderIndex", async () => {
    useStreamStore.setState({ streams: sampleTree() });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, {}));

    await useStreamStore.getState().reorderStreams(null, ["b", "a"]);

    const tree = useStreamStore.getState().streams;
    expect(tree.map((n) => n.id)).toEqual(["b", "a"]);
    expect(tree[0].orderIndex).toBe(0);
    expect(tree[1].orderIndex).toBe(1);
  });

  it("reorderStreams reorders a nested level without touching siblings", async () => {
    useStreamStore.setState({ streams: sampleTree() });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, {}));

    await useStreamStore.getState().reorderStreams("a", ["a2", "a1"]);

    const tree = useStreamStore.getState().streams;
    expect(tree[0].children.map((c) => c.id)).toEqual(["a2", "a1"]);
    expect(tree[0].children[0].orderIndex).toBe(0);
    expect(tree[0].children[1].orderIndex).toBe(1);
    expect(tree[1].id).toBe("b");
  });

  it("reorderStreams rolls back on failure", async () => {
    useStreamStore.setState({ streams: sampleTree() });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));

    await useStreamStore.getState().reorderStreams(null, ["b", "a"]);

    const ids = useStreamStore.getState().streams.map((n) => n.id);
    expect(ids).toEqual(["a", "b"]);
  });

  it("archiveStream optimistically removes the node then refetches the tree", async () => {
    useStreamStore.setState({ streams: sampleTree() });
    vi.mocked(fetch).mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (u.includes("workspaceId=")) {
        return jsonResponse(200, { tree: [node("b", "Beta", 0)], archived: [node("a", "Alpha", 0)] });
      }
      return jsonResponse(200, {});
    });

    await useStreamStore.getState().archiveStream("a");

    const state = useStreamStore.getState();
    expect(state.streams.map((n) => n.id)).toEqual(["b"]);
    expect(state.archivedStreams.map((n) => n.id)).toEqual(["a"]);
  });
});
