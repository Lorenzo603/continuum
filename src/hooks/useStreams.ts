import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useStreamStore } from "@/stores/streamStore";

export function useStreams(workspaceId: string | null) {
  const { isLoaded, isSignedIn } = useAuth();
  const { streams, loading, error, authRequired, fetchStreams, resetForSignedOut } = useStreamStore();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      resetForSignedOut();
      return;
    }

    if (workspaceId) {
      fetchStreams(workspaceId);
    }
  }, [workspaceId, isLoaded, isSignedIn, fetchStreams, resetForSignedOut]);

  return {
    streams,
    loading,
    error,
    authRequired,
    refetch: () => workspaceId ? fetchStreams(workspaceId) : Promise.resolve(),
  };
}
