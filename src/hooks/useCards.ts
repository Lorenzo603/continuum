import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useCardStore } from "@/stores/cardStore";

const EMPTY_CARDS: never[] = [];

export function useCards(streamId: string, workspaceId: string) {
  const { isLoaded, isSignedIn } = useAuth();
  const cards = useCardStore(
    (state) => state.cardsByStream[streamId] ?? EMPTY_CARDS
  );
  const loading = useCardStore((state) => state.loading[streamId] ?? false);
  const error = useCardStore((state) => state.error);
  const authRequired = useCardStore((state) => state.authRequired);
  const fetchCards = useCardStore((state) => state.fetchCards);
  const resetForSignedOut = useCardStore((state) => state.resetForSignedOut);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      resetForSignedOut();
      return;
    }

    fetchCards(streamId, workspaceId);
  }, [streamId, workspaceId, isLoaded, isSignedIn, fetchCards, resetForSignedOut]);

  return { cards, loading, error, authRequired };
}
