import { useCallback } from "react";
import { useCardStore } from "@/stores/cardStore";
import { useUIStore } from "@/stores/uiStore";
import type { CardMetadata } from "@/types";

export function useCardUpdate() {
  const updateCard = useCardStore((state) => state.updateCard);
  const createCard = useCardStore((state) => state.createCard);
  const setEditingCard = useUIStore((state) => state.setEditingCard);

  const handleUpdate = useCallback(
    async (
      cardId: string,
      streamId: string,
      content: string,
      metadata?: CardMetadata | null
    ) => {
      await updateCard(cardId, streamId, content, metadata);
      setEditingCard(null);
    },
    [updateCard, setEditingCard]
  );

  const handleCreate = useCallback(
    async (
      streamId: string,
      content: string,
      metadata?: CardMetadata | null
    ) => {
      await createCard(streamId, content, metadata);
      setEditingCard(null);
    },
    [createCard, setEditingCard]
  );

  return { handleUpdate, handleCreate };
}
