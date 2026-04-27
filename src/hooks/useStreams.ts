import { useEffect } from "react";
import { useStreamStore } from "@/stores/streamStore";

export function useStreams(workspaceId: string | null) {
  const { streams, loading, error, authRequired, fetchStreams } = useStreamStore();

  useEffect(() => {
    if (workspaceId) {
      fetchStreams(workspaceId);
    }
  }, [workspaceId, fetchStreams]);

  return {
    streams,
    loading,
    error,
    authRequired,
    refetch: () => workspaceId ? fetchStreams(workspaceId) : Promise.resolve(),
  };
}
