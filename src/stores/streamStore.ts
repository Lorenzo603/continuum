import { create } from "zustand";
import type { StreamNode } from "@/types";

interface StreamState {
  streams: StreamNode[];
  loading: boolean;
  error: string | null;

  fetchStreams: () => Promise<void>;
  addStream: (title: string, parentStreamId?: string | null) => Promise<void>;
  updateStream: (
    id: string,
    data: { title?: string; orderIndex?: number }
  ) => Promise<void>;
  deleteStream: (id: string) => Promise<void>;
}

export const useStreamStore = create<StreamState>((set, get) => ({
  streams: [],
  loading: false,
  error: null,

  fetchStreams: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/streams");
      if (!res.ok) throw new Error("Failed to fetch streams");
      const data = await res.json();
      set({ streams: data, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      });
    }
  },

  addStream: async (title, parentStreamId = null) => {
    const prev = get().streams;
    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, parentStreamId }),
      });
      if (!res.ok) throw new Error("Failed to create stream");
      // Refetch the full tree to get proper nesting
      await get().fetchStreams();
    } catch (error) {
      set({
        streams: prev,
        error: error instanceof Error ? error.message : "Failed to create stream",
      });
    }
  },

  updateStream: async (id, data) => {
    const prev = get().streams;
    // Optimistic update for title changes
    if (data.title) {
      set({
        streams: updateNodeInTree(prev, id, (node) => ({
          ...node,
          title: data.title!,
        })),
      });
    }
    try {
      const res = await fetch(`/api/streams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update stream");
      // If orderIndex changed, refetch for proper ordering
      if (data.orderIndex !== undefined) {
        await get().fetchStreams();
      }
    } catch (error) {
      set({
        streams: prev,
        error: error instanceof Error ? error.message : "Failed to update stream",
      });
    }
  },

  deleteStream: async (id) => {
    const prev = get().streams;
    // Optimistic removal
    set({ streams: removeNodeFromTree(prev, id) });
    try {
      const res = await fetch(`/api/streams/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete stream");
    } catch (error) {
      set({
        streams: prev,
        error: error instanceof Error ? error.message : "Failed to delete stream",
      });
    }
  },
}));

// Helper: recursively update a node in the tree
function updateNodeInTree(
  nodes: StreamNode[],
  id: string,
  updater: (node: StreamNode) => StreamNode
): StreamNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    return {
      ...node,
      children: updateNodeInTree(node.children, id, updater),
    };
  });
}

// Helper: recursively remove a node from the tree
function removeNodeFromTree(nodes: StreamNode[], id: string): StreamNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeNodeFromTree(node.children, id),
    }));
}
