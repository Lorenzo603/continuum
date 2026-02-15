import { useEffect } from "react";
import { useCardStore } from "@/stores/cardStore";

export function useCards(streamId: string) {
  const cards = useCardStore((state) => state.cardsByStream[streamId] ?? []);
  const loading = useCardStore((state) => state.loading[streamId] ?? false);
  const error = useCardStore((state) => state.error);
  const fetchCards = useCardStore((state) => state.fetchCards);

  useEffect(() => {
    fetchCards(streamId);
  }, [streamId, fetchCards]);

  return { cards, loading, error };
}
