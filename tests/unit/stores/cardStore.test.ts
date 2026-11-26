/**
 * Unit tests for src/stores/cardStore.ts — optimistic card creation and rollback.
 * fetch is mocked; no network or database involved.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCardStore } from "@/stores/cardStore";
import type { Card } from "@/types";

function cardFixture(id: string, version: number, isEditable = true): Card {
  return {
    id,
    userId: "user-1",
    streamId: "stream-1",
    content: `content-${id}`,
    version,
    isEditable,
    metadata: null,
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

describe("useCardStore", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    useCardStore.setState({
      cardsByStream: {},
      loading: {},
      error: null,
      authRequired: false,
      _mutationVersion: {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchCards populates cards and caches (no duplicate fetch)", async () => {
    const cards = [cardFixture("c1", 1)];
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, cards));

    await useCardStore.getState().fetchCards("stream-1");
    await useCardStore.getState().fetchCards("stream-1"); // second call must be a no-op

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(useCardStore.getState().cardsByStream["stream-1"]).toHaveLength(1);
  });

  it("fetchCards sets authRequired on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, {}));

    await useCardStore.getState().fetchCards("stream-1");

    expect(useCardStore.getState().authRequired).toBe(true);
  });

  it("createCard adds an optimistic card, replaces it with the server card", async () => {
    const existing = cardFixture("c1", 1, true);
    useCardStore.setState({ cardsByStream: { "stream-1": [existing] } });

    const serverCard = cardFixture("c2", 2, true);
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(201, serverCard)) // POST /api/cards
      .mockResolvedValueOnce(jsonResponse(200, [{ ...existing, isEditable: false }, serverCard])); // refetch

    await useCardStore.getState().createCard("stream-1", "new content");

    const cards = useCardStore.getState().cardsByStream["stream-1"];
    expect(cards.map((c) => c.id)).toContain("c2");
    expect(cards.find((c) => c.id === "c1")?.isEditable).toBe(false);
  });

  it("createCard rolls back the optimistic card on failure", async () => {
    const existing = cardFixture("c1", 1, true);
    useCardStore.setState({ cardsByStream: { "stream-1": [existing] } });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));

    await useCardStore.getState().createCard("stream-1", "new content");

    const state = useCardStore.getState();
    expect(state.cardsByStream["stream-1"]).toEqual([existing]);
    expect(state.error).toBe("Failed to create card");
  });

  it("updateCard replaces the card with the server response", async () => {
    const existing = cardFixture("c1", 1, true);
    useCardStore.setState({ cardsByStream: { "stream-1": [existing] } });
    const updated = { ...existing, content: "edited" };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, updated));

    await useCardStore.getState().updateCard("c1", "stream-1", "edited");

    const cards = useCardStore.getState().cardsByStream["stream-1"];
    expect(cards[0].content).toBe("edited");
  });

  it("updateCard rolls back on failure", async () => {
    const existing = cardFixture("c1", 1, true);
    useCardStore.setState({ cardsByStream: { "stream-1": [existing] } });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}));

    await useCardStore.getState().updateCard("c1", "stream-1", "edited");

    const state = useCardStore.getState();
    expect(state.cardsByStream["stream-1"][0].content).toBe("content-c1");
    expect(state.error).toBe("Failed to update card");
  });
});
