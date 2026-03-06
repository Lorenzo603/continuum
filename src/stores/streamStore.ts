import { create } from "zustand";
import type { Stream, StreamNode } from "@/types";

interface StreamState {
  streams: StreamNode[];
  archivedStreams: Stream[];
  currentWorkspaceId: string | null;
  loading: boolean;
  error: string | null;

  fetchStreams: (workspaceId: string) => Promise<void>;
  addStream: (title: string, workspaceId: string, parentStreamId?: string | null) => Promise<void>;
  updateStream: (
    id: string,
    data: { title?: string; orderIndex?: number }
  ) => Promise<void>;
  deleteStream: (id: string) => Promise<void>;
  archiveStream: (id: string) => Promise<void>;
  unarchiveStream: (id: string) => Promise<void>;
  reorderStreams: (
    parentStreamId: string | null,
    orderedIds: string[]
  ) => Promise<void>;
}

export const useStreamStore = create<StreamState>((set, get) => ({
  streams: [],
  archivedStreams: [],
  currentWorkspaceId: null,
  loading: false,
  error: null,

  fetchStreams: async (workspaceId: string) => {
    set({ loading: true, error: null, currentWorkspaceId: workspaceId });
    try {
      const res = await fetch(`/api/streams?workspaceId=${encodeURIComponent(workspaceId)}`);
      if (!res.ok) throw new Error("Failed to fetch streams");
      const data = await res.json();
      set({ streams: data.tree, archivedStreams: data.archived, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      });
    }
  },

  addStream: async (title, workspaceId, parentStreamId = null) => {
    const prev = get().streams;
    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, workspaceId, parentStreamId }),
      });
      if (!res.ok) throw new Error("Failed to create stream");
      // Refetch the full tree to get proper nesting
      await get().fetchStreams(workspaceId);
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
        const wsId = get().currentWorkspaceId;
        if (wsId) await get().fetchStreams(wsId);
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

  archiveStream: async (id) => {
    const prev = get().streams;
    // Optimistic removal from tree
    set({ streams: removeNodeFromTree(prev, id) });
    try {
      const res = await fetch(`/api/streams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) throw new Error("Failed to archive stream");
      // Refetch to update archived list
      const wsId = get().currentWorkspaceId;
      if (wsId) await get().fetchStreams(wsId);
    } catch (error) {
      set({
        streams: prev,
        error: error instanceof Error ? error.message : "Failed to archive stream",
      });
    }
  },

  unarchiveStream: async (id) => {
    const prevArchived = get().archivedStreams;
    // Optimistic removal from archived list
    set({ archivedStreams: prevArchived.filter((s) => s.id !== id) });
    try {
      const res = await fetch(`/api/streams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error("Failed to unarchive stream");
      // Refetch to get the restored stream in the active tree
      const wsId = get().currentWorkspaceId;
      if (wsId) await get().fetchStreams(wsId);
    } catch (error) {
      set({
        archivedStreams: prevArchived,
        error: error instanceof Error ? error.message : "Failed to unarchive stream",
      });
    }
  },

  reorderStreams: async (parentStreamId, orderedIds) => {
    const prev = get().streams;
    // Optimistic reorder
    set({
      streams: reorderNodesInTree(prev, parentStreamId, orderedIds),
    });
    try {
      const res = await fetch("/api/streams/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error("Failed to reorder streams");
    } catch (error) {
      set({
        streams: prev,
        error: error instanceof Error ? error.message : "Failed to reorder streams",
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

// Helper: reorder nodes at a specific level in the tree
function reorderNodesInTree(
  nodes: StreamNode[],
  parentStreamId: string | null,
  orderedIds: string[]
): StreamNode[] {
  if (parentStreamId === null) {
    // Reorder top-level nodes
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return orderedIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is StreamNode => n !== undefined)
      .map((node, index) => ({ ...node, orderIndex: index }));
  }

  // Recurse into children to find the parent
  return nodes.map((node) => {
    if (node.id === parentStreamId) {
      const childMap = new Map(node.children.map((c) => [c.id, c]));
      return {
        ...node,
        children: orderedIds
          .map((id) => childMap.get(id))
          .filter((c): c is StreamNode => c !== undefined)
          .map((child, index) => ({ ...child, orderIndex: index })),
      };
    }
    return {
      ...node,
      children: reorderNodesInTree(node.children, parentStreamId, orderedIds),
    };
  });
}
