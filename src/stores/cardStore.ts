import { create } from "zustand";
import type { Card, CardMetadata } from "@/types";

interface CardState {
  cardsByStream: Record<string, Card[]>;
  loading: Record<string, boolean>;
  error: string | null;
  authRequired: boolean;
  /** Internal mutation counter per stream — prevents stale fetches from overwriting mutation results */
  _mutationVersion: Record<string, number>;

  fetchCards: (streamId: string, workspaceId?: string) => Promise<void>;
  resetForSignedOut: () => void;
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
  deleteCard: (cardId: string, streamId: string) => Promise<void>;
}

export const useCardStore = create<CardState>((set, get) => ({
  cardsByStream: {},
  loading: {},
  error: null,
  authRequired: false,
  _mutationVersion: {},

  fetchCards: async (streamId, workspaceId) => {
    // Skip if we already have data for this stream (prevents StrictMode double-fetch race)
    if (get().cardsByStream[streamId] !== undefined) return;

    const versionAtStart = get()._mutationVersion[streamId] ?? 0;
    set((state) => ({
      loading: { ...state.loading, [streamId]: true },
      error: null,
    }));
    try {
      const workspaceQuery = workspaceId
        ? `?workspaceId=${encodeURIComponent(workspaceId)}`
        : "";
      const res = await fetch(`/api/streams/${streamId}/cards${workspaceQuery}`, {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        set((state) => ({
          loading: { ...state.loading, [streamId]: false },
          authRequired: true,
        }));
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();
      // Only write if no mutation happened during the fetch
      if ((get()._mutationVersion[streamId] ?? 0) === versionAtStart) {
        set((state) => ({
          cardsByStream: { ...state.cardsByStream, [streamId]: data },
          loading: { ...state.loading, [streamId]: false },
          authRequired: false,
        }));
      } else {
        set((state) => ({
          loading: { ...state.loading, [streamId]: false },
        }));
      }
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, [streamId]: false },
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  },

  resetForSignedOut: () => {
    set({
      cardsByStream: {},
      loading: {},
      error: null,
      authRequired: true,
      _mutationVersion: {},
    });
  },

  createCard: async (streamId, content, metadata = null) => {
    const prev = get().cardsByStream[streamId] ?? [];
    // Bump mutation version to invalidate any in-flight fetchCards
    const nextVersion = (get()._mutationVersion[streamId] ?? 0) + 1;
    // Optimistic: add a temporary card
    const optimisticCard: Card = {
      id: `temp-${Date.now()}`,
      userId: prev[prev.length - 1]?.userId ?? "optimistic-user",
      streamId,
      content,
      version: prev.length > 0 ? prev[prev.length - 1].version + 1 : 1,
      isEditable: true,
      metadata: metadata ?? null,
      createdAt: new Date().toISOString(),
    };
    const optimisticCards = prev.map((c) => {
      if (!c.isEditable) return c;
      const completedMetadata: CardMetadata = {
        ...(c.metadata ?? {}),
        status: "completed",
      };
      return {
        ...c,
        isEditable: false as const,
        metadata: completedMetadata,
      };
    });
    set((state) => ({
      _mutationVersion: { ...state._mutationVersion, [streamId]: nextVersion },
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
      if (res.status === 401 || res.status === 403) {
        set((state) => ({
          cardsByStream: { ...state.cardsByStream, [streamId]: prev },
          error: "Authentication required",
          authRequired: true,
        }));
        return;
      }
      if (!res.ok) throw new Error("Failed to create card");
      const newCard: Card = await res.json();

      // Re-fetch to ensure server-side status updates (previous card -> completed) are reflected
      const cardsRes = await fetch(`/api/streams/${streamId}/cards`, {
        cache: "no-store",
      });
      if (cardsRes.ok) {
        const data = await cardsRes.json();
        set((state) => ({
          cardsByStream: { ...state.cardsByStream, [streamId]: data },
          authRequired: false,
        }));
      } else {
        // Fallback: at least replace the optimistic temp card with the real server card
        set((state) => {
          const current = state.cardsByStream[streamId] ?? [];
          const updated = current.map((c) =>
            c.id === optimisticCard.id ? newCard : c
          );
          return {
            cardsByStream: { ...state.cardsByStream, [streamId]: updated },
          };
        });
      }
    } catch (error) {
      // Rollback on POST failure
      set((state) => ({
        cardsByStream: { ...state.cardsByStream, [streamId]: prev },
        error:
          error instanceof Error ? error.message : "Failed to create card",
      }));
    }
  },

  updateCard: async (cardId, streamId, content, metadata = null) => {
    const prev = get().cardsByStream[streamId] ?? [];
    // Bump mutation version to invalidate any in-flight fetchCards
    const nextVersion = (get()._mutationVersion[streamId] ?? 0) + 1;
    const currentCard = prev.find((c) => c.id === cardId);
    if (!currentCard) return;

    // Optimistic: update the card in-place
    const optimisticCards = prev.map((c) =>
      c.id === cardId
        ? { ...c, content, metadata: metadata ?? c.metadata }
        : c
    );
    set((state) => ({
      _mutationVersion: { ...state._mutationVersion, [streamId]: nextVersion },
      cardsByStream: { ...state.cardsByStream, [streamId]: optimisticCards },
    }));

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, metadata }),
      });
      if (res.status === 401 || res.status === 403) {
        set((state) => ({
          cardsByStream: { ...state.cardsByStream, [streamId]: prev },
          error: "Authentication required",
          authRequired: true,
        }));
        return;
      }
      if (!res.ok) throw new Error("Failed to update card");
      const updatedCard: Card = await res.json();

      // Replace the optimistic card with the real server card
      set((state) => {
        const current = state.cardsByStream[streamId] ?? [];
        const updated = current.map((c) =>
          c.id === cardId ? updatedCard : c
        );
        return {
          cardsByStream: { ...state.cardsByStream, [streamId]: updated },
          authRequired: false,
        };
      });
    } catch (error) {
      set((state) => ({
        cardsByStream: { ...state.cardsByStream, [streamId]: prev },
        error:
          error instanceof Error ? error.message : "Failed to update card",
      }));
    }
  },

  deleteCard: async (cardId, streamId) => {
    const prev = get().cardsByStream[streamId] ?? [];
    const nextVersion = (get()._mutationVersion[streamId] ?? 0) + 1;

    // Optimistic: remove card and make previous one editable
    const filtered = prev.filter((c) => c.id !== cardId);
    if (filtered.length > 0) {
      filtered[filtered.length - 1] = { ...filtered[filtered.length - 1], isEditable: true };
    }
    set((state) => ({
      _mutationVersion: { ...state._mutationVersion, [streamId]: nextVersion },
      cardsByStream: { ...state.cardsByStream, [streamId]: filtered },
    }));

    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      if (res.status === 401 || res.status === 403) {
        set((state) => ({
          cardsByStream: { ...state.cardsByStream, [streamId]: prev },
          error: "Authentication required",
          authRequired: true,
        }));
        return;
      }
      if (!res.ok) throw new Error("Failed to delete card");
      // Re-fetch to get accurate server state
      const cardsRes = await fetch(`/api/streams/${streamId}/cards`, { cache: "no-store" });
      if (cardsRes.ok) {
        const data = await cardsRes.json();
        set((state) => ({
          cardsByStream: { ...state.cardsByStream, [streamId]: data },
          authRequired: false,
        }));
      }
    } catch (error) {
      set((state) => ({
        cardsByStream: { ...state.cardsByStream, [streamId]: prev },
        error: error instanceof Error ? error.message : "Failed to delete card",
      }));
    }
  },
}));
