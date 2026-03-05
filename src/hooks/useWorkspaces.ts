import { useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function useWorkspaces() {
  const {
    workspaces,
    activeWorkspaceId,
    loading,
    error,
    fetchWorkspaces,
    setActiveWorkspace,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    loading,
    error,
    setActiveWorkspace,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refetch: fetchWorkspaces,
  };
}
