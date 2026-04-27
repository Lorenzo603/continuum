import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function useWorkspaces() {
  const { isLoaded, isSignedIn } = useAuth();
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
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      resetForSignedOut();
      return;
    }

    fetchWorkspaces();
  }, [isLoaded, isSignedIn, fetchWorkspaces, resetForSignedOut]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

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
