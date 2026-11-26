/**
 * Unit tests for src/stores/uiStore.ts — pure set-based state logic.
 * No network, no React. State is reset between tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/stores/uiStore";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      expandedStreams: new Set(),
      editingCardId: null,
      selectedStreamId: null,
      isCreatingStream: false,
      cardEditorModal: null,
      searchQuery: "",
      showArchived: false,
      statusFilters: new Set(),
    });
  });

  it("toggleStreamExpand adds then removes a stream id", () => {
    const { toggleStreamExpand } = useUIStore.getState();

    toggleStreamExpand("s1");
    expect(useUIStore.getState().expandedStreams.has("s1")).toBe(true);

    toggleStreamExpand("s1");
    expect(useUIStore.getState().expandedStreams.has("s1")).toBe(false);
  });

  it("toggleStreamExpand preserves other expanded ids", () => {
    const { toggleStreamExpand } = useUIStore.getState();
    toggleStreamExpand("s1");
    toggleStreamExpand("s2");
    toggleStreamExpand("s1");

    const expanded = useUIStore.getState().expandedStreams;
    expect(expanded.has("s1")).toBe(false);
    expect(expanded.has("s2")).toBe(true);
  });

  it("setSelectedStream and setEditingCard update state", () => {
    useUIStore.getState().setSelectedStream("s1");
    expect(useUIStore.getState().selectedStreamId).toBe("s1");

    useUIStore.getState().setEditingCard("c1");
    expect(useUIStore.getState().editingCardId).toBe("c1");
  });

  it("openCardEditor and closeCardEditor manage the modal state", () => {
    const modal = { streamId: "s1", initialContent: "hi", initialMode: "view" as const };
    useUIStore.getState().openCardEditor(modal);
    expect(useUIStore.getState().cardEditorModal).toEqual(modal);

    useUIStore.getState().closeCardEditor();
    expect(useUIStore.getState().cardEditorModal).toBeNull();
  });

  it("toggleStatusFilter adds and removes filters", () => {
    useUIStore.getState().toggleStatusFilter("in-progress");
    expect(useUIStore.getState().statusFilters.has("in-progress")).toBe(true);

    useUIStore.getState().toggleStatusFilter("in-progress");
    expect(useUIStore.getState().statusFilters.has("in-progress")).toBe(false);
  });

  it("clearStatusFilters empties the filter set", () => {
    useUIStore.getState().toggleStatusFilter("waiting");
    useUIStore.getState().toggleStatusFilter("completed");
    useUIStore.getState().clearStatusFilters();
    expect(useUIStore.getState().statusFilters.size).toBe(0);
  });

  it("setSearchQuery and setShowArchived update state", () => {
    useUIStore.getState().setSearchQuery("hello");
    useUIStore.getState().setShowArchived(true);
    expect(useUIStore.getState().searchQuery).toBe("hello");
    expect(useUIStore.getState().showArchived).toBe(true);
  });
});
