import { create } from "zustand";
import type { Workspace } from "@/types";

const ACTIVE_WORKSPACE_KEY = "continuum:activeWorkspaceId";

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  loading: boolean;
  error: string | null;
  authRequired: boolean;

  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string | null) => void;
  resetForSignedOut: () => void;
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
  authRequired: false,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/workspaces");
      if (res.status === 401 || res.status === 403) {
        set({
          workspaces: [],
          activeWorkspaceId: null,
          loading: false,
          error: null,
          authRequired: true,
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
        }
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      const data: Workspace[] = await res.json();
      set({ workspaces: data, loading: false, authRequired: false });

      const current = get().activeWorkspaceId;
      const saved = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_WORKSPACE_KEY) : null;
      const preferred = current ?? saved;

      if (preferred && data.find((w) => w.id === preferred)) {
        set({ activeWorkspaceId: preferred });
      } else {
        set({ activeWorkspaceId: null });
        if (typeof window !== "undefined") {
          localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
        }
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
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      }
    }
  },

  resetForSignedOut: () => {
    set({
      workspaces: [],
      activeWorkspaceId: null,
      loading: false,
      error: null,
      authRequired: true,
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
  },

  addWorkspace: async (name, description = null) => {
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (res.status === 401 || res.status === 403) {
        set({ error: "Authentication required", authRequired: true });
        return null;
      }
      if (!res.ok) throw new Error("Failed to create workspace");
      const workspace: Workspace = await res.json();
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        activeWorkspaceId: workspace.id,
        authRequired: false,
      }));
      if (typeof window !== "undefined") localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id);
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
      if (res.status === 401 || res.status === 403) {
        set({
          workspaces: prev,
          error: "Authentication required",
          authRequired: true,
        });
        return;
      }
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
      const newId = filtered[0]?.id ?? null;
      set({ activeWorkspaceId: newId });
      if (typeof window !== "undefined") {
        if (newId) localStorage.setItem(ACTIVE_WORKSPACE_KEY, newId);
        else localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      }
    }

    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
      if (res.status === 401 || res.status === 403) {
        set({
          workspaces: prev,
          error: "Authentication required",
          authRequired: true,
        });
        return;
      }
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
