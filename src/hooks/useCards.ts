import { useEffect } from "react";
import { useCardStore } from "@/stores/cardStore";

const EMPTY_CARDS: never[] = [];

export function useCards(streamId: string, workspaceId: string) {
  const cards = useCardStore(
    (state) => state.cardsByStream[streamId] ?? EMPTY_CARDS
  );
  const loading = useCardStore((state) => state.loading[streamId] ?? false);
  const error = useCardStore((state) => state.error);
  const authRequired = useCardStore((state) => state.authRequired);
  const fetchCards = useCardStore((state) => state.fetchCards);

  useEffect(() => {
    fetchCards(streamId, workspaceId);
  }, [streamId, workspaceId, fetchCards]);

  return { cards, loading, error, authRequired };
}
