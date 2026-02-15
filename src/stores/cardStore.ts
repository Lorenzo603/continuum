import { create } from "zustand";
import type { Card, CardMetadata } from "@/types";

interface CardState {
  cardsByStream: Record<string, Card[]>;
  loading: Record<string, boolean>;
  error: string | null;

  fetchCards: (streamId: string) => Promise<void>;
  createCard: (
    streamId: string,
    content: string,
    metadata?: CardMetadata | null
  ) => Promise<void>;
  updateCard: (
    cardId: string,
    streamId: string,
    content: string,
    metadata?: CardMetadata | null
  ) => Promise<void>;
}

export const useCardStore = create<CardState>((set, get) => ({
  cardsByStream: {},
  loading: {},
  error: null,

  fetchCards: async (streamId) => {
    set((state) => ({
      loading: { ...state.loading, [streamId]: true },
      error: null,
    }));
    try {
      const res = await fetch(`/api/streams/${streamId}/cards`);
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();
      set((state) => ({
        cardsByStream: { ...state.cardsByStream, [streamId]: data },
        loading: { ...state.loading, [streamId]: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, [streamId]: false },
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  },

  createCard: async (streamId, content, metadata = null) => {
    const prev = get().cardsByStream[streamId] ?? [];
    // Optimistic: add a temporary card
    const optimisticCard: Card = {
      id: `temp-${Date.now()}`,
      streamId,
      content,
      version: prev.length > 0 ? prev[prev.length - 1].version + 1 : 1,
      isEditable: true,
      metadata: metadata ?? null,
      createdAt: new Date().toISOString(),
    };
    const optimisticCards = prev.map((c) =>
      c.isEditable ? { ...c, isEditable: false as const } : c
    );
    set((state) => ({
      cardsByStream: {
        ...state.cardsByStream,
        [streamId]: [...optimisticCards, optimisticCard],
      },
    }));

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId, content, metadata }),
      });
      if (!res.ok) throw new Error("Failed to create card");
      // Refetch actual cards from server
      await get().fetchCards(streamId);
    } catch (error) {
      // Rollback
      set((state) => ({
        cardsByStream: { ...state.cardsByStream, [streamId]: prev },
        error:
          error instanceof Error ? error.message : "Failed to create card",
      }));
    }
  },

  updateCard: async (cardId, streamId, content, metadata = null) => {
    const prev = get().cardsByStream[streamId] ?? [];
    // Optimistic: mark current card non-editable, and add new version
    const currentCard = prev.find((c) => c.id === cardId);
    if (!currentCard) return;

    const optimisticNew: Card = {
      id: `temp-${Date.now()}`,
      streamId,
      content,
      version: currentCard.version + 1,
      isEditable: true,
      metadata: metadata ?? currentCard.metadata,
      createdAt: new Date().toISOString(),
    };
    const optimisticCards = [
      ...prev.map((c) =>
        c.id === cardId ? { ...c, isEditable: false as const } : c
      ),
      optimisticNew,
    ];
    set((state) => ({
      cardsByStream: { ...state.cardsByStream, [streamId]: optimisticCards },
    }));

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, metadata }),
      });
      if (!res.ok) throw new Error("Failed to update card");
      await get().fetchCards(streamId);
    } catch (error) {
      set((state) => ({
        cardsByStream: { ...state.cardsByStream, [streamId]: prev },
        error:
          error instanceof Error ? error.message : "Failed to update card",
      }));
    }
  },
}));
