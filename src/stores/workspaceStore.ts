import { create } from "zustand";
import type { Workspace } from "@/types";

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  loading: boolean;
  error: string | null;

  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  addWorkspace: (name: string, description?: string | null) => Promise<Workspace | null>;
  updateWorkspace: (
    id: string,
    data: { name?: string; description?: string | null }
  ) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      const data: Workspace[] = await res.json();
      set({ workspaces: data, loading: false });

      // Auto-select first workspace if none active
      const current = get().activeWorkspaceId;
      if ((!current || !data.find((w) => w.id === current)) && data.length > 0) {
        set({ activeWorkspaceId: data[0].id });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
      });
    }
  },

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id });
  },

  addWorkspace: async (name, description = null) => {
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      const workspace: Workspace = await res.json();
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        activeWorkspaceId: workspace.id,
      }));
      return workspace;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to create workspace",
      });
      return null;
    }
  },

  updateWorkspace: async (id, data) => {
    const prev = get().workspaces;
    // Optimistic update
    set({
      workspaces: prev.map((w) => (w.id === id ? { ...w, ...data } : w)),
    });
    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update workspace");
    } catch (error) {
      set({
        workspaces: prev,
        error:
          error instanceof Error ? error.message : "Failed to update workspace",
      });
    }
  },

  deleteWorkspace: async (id) => {
    const prev = get().workspaces;
    const filtered = prev.filter((w) => w.id !== id);
    set({ workspaces: filtered });

    // If deleting active workspace, switch to another
    if (get().activeWorkspaceId === id) {
      set({ activeWorkspaceId: filtered[0]?.id ?? null });
    }

    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workspace");
    } catch (error) {
      set({
        workspaces: prev,
        error:
          error instanceof Error ? error.message : "Failed to delete workspace",
      });
    }
  },
}));
