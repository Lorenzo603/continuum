import { useEffect } from "react";
import { useStreamStore } from "@/stores/streamStore";

export function useStreams(workspaceId: string | null) {
  const { streams, loading, error, fetchStreams } = useStreamStore();

  useEffect(() => {
    if (workspaceId) {
      fetchStreams(workspaceId);
    }
  }, [workspaceId, fetchStreams]);

  return { streams, loading, error, refetch: () => workspaceId ? fetchStreams(workspaceId) : Promise.resolve() };
}
