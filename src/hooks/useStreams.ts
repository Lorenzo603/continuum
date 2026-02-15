import { useEffect } from "react";
import { useStreamStore } from "@/stores/streamStore";

export function useStreams() {
  const { streams, loading, error, fetchStreams } = useStreamStore();

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  return { streams, loading, error, refetch: fetchStreams };
}
