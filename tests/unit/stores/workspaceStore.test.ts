/**
 * Unit tests for src/stores/workspaceStore.ts — optimistic updates + rollback.
 * fetch is mocked via vi.stubGlobal; localStorage is stubbed for the
 * active-workspace persistence path.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Workspace } from "@/types";

function workspaceFixture(id: string, name: string, orderIndex = 0): Workspace {
  return {
    id,
    userId: "user-1",
    name,
    description: null,
    orderIndex,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
      loading: false,
      error: null,
      authRequired: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchWorkspaces populates workspaces and marks loading false", async () => {
    const ws = workspaceFixture("w1", "Alpha");
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, [ws]));

    await useWorkspaceStore.getState().fetchWorkspaces();

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0].name).toBe("Alpha");
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("fetchWorkspaces sets authRequired on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { error: "Unauthorized" }));

    await useWorkspaceStore.getState().fetchWorkspaces();

    const state = useWorkspaceStore.getState();
    expect(state.authRequired).toBe(true);
    expect(state.workspaces).toHaveLength(0);
  });

  it("fetchWorkspaces sets an error on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));

    await useWorkspaceStore.getState().fetchWorkspaces();

    expect(useWorkspaceStore.getState().error).toBe("Failed to fetch workspaces");
  });

  it("addWorkspace appends the created workspace and selects it", async () => {
    const created = workspaceFixture("w2", "Beta");
    vi.mocked(fetch).mockResolvedValue(jsonResponse(201, created));

    const result = await useWorkspaceStore.getState().addWorkspace("Beta");

    expect(result?.id).toBe("w2");
    const state = useWorkspaceStore.getState();
    expect(state.workspaces.map((w) => w.id)).toContain("w2");
    expect(state.activeWorkspaceId).toBe("w2");
  });

  it("addWorkspace returns null and sets authRequired on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));

    const result = await useWorkspaceStore.getState().addWorkspace("Beta");

    expect(result).toBeNull();
    expect(useWorkspaceStore.getState().authRequired).toBe(true);
  });

  it("updateWorkspace rolls back optimistic state on failure", async () => {
    const ws = workspaceFixture("w1", "Before");
    useWorkspaceStore.setState({ workspaces: [ws] });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));

    await useWorkspaceStore.getState().updateWorkspace("w1", { name: "After" });

    const state = useWorkspaceStore.getState();
    expect(state.workspaces[0].name).toBe("Before");
    expect(state.error).toBe("Failed to update workspace");
  });

  it("deleteWorkspace removes the workspace and returns on failure", async () => {
    const ws = workspaceFixture("w1", "Alpha");
    useWorkspaceStore.setState({ workspaces: [ws], activeWorkspaceId: "w1" });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));

    await useWorkspaceStore.getState().deleteWorkspace("w1");

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.error).toBe("Failed to delete workspace");
  });

  it("reorderWorkspaces reorders and renumbers optimistically", async () => {
    const w1 = workspaceFixture("w1", "A", 0);
    const w2 = workspaceFixture("w2", "B", 1);
    const w3 = workspaceFixture("w3", "C", 2);
    useWorkspaceStore.setState({ workspaces: [w1, w2, w3] });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, {}));

    await useWorkspaceStore.getState().reorderWorkspaces(["w3", "w1"]);

    const state = useWorkspaceStore.getState();
    const ids = state.workspaces.map((w) => w.id);
    expect(ids.slice(0, 2)).toEqual(["w3", "w1"]);
    expect(state.workspaces.find((w) => w.id === "w3")?.orderIndex).toBe(0);
    expect(state.workspaces.find((w) => w.id === "w1")?.orderIndex).toBe(1);
    // Untouched workspace keeps its relative position but gets a fresh orderIndex
    expect(ids).toContain("w2");
  });

  it("reorderWorkspaces rolls back on failure", async () => {
    const w1 = workspaceFixture("w1", "A", 0);
    const w2 = workspaceFixture("w2", "B", 1);
    useWorkspaceStore.setState({ workspaces: [w1, w2] });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));

    await useWorkspaceStore.getState().reorderWorkspaces(["w2", "w1"]);

    const ids = useWorkspaceStore.getState().workspaces.map((w) => w.id);
    expect(ids).toEqual(["w1", "w2"]);
  });
});
