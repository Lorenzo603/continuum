import { useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { CLERK_AUTH_ENABLED } from "@/lib/authMode";

export function useWorkspaces() {
  const {
    workspaces,
    activeWorkspaceId,
    loading,
    error,
    authRequired,
    fetchWorkspaces,
    resetForSignedOut,
    setActiveWorkspace,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (CLERK_AUTH_ENABLED && authRequired) {
      resetForSignedOut();
    }
  }, [authRequired, resetForSignedOut]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const isLoaded = true;
  const isSignedIn = CLERK_AUTH_ENABLED ? !authRequired : true;

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    loading,
    error,
    authRequired,
    isLoaded,
    isSignedIn,
    setActiveWorkspace,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refetch: fetchWorkspaces,
  };
}
