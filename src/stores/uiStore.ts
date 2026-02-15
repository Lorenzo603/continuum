import { create } from "zustand";

interface UIState {
  expandedStreams: Set<string>;
  editingCardId: string | null;
  selectedStreamId: string | null;
  isCreatingStream: boolean;

  toggleStreamExpand: (streamId: string) => void;
  setEditingCard: (cardId: string | null) => void;
  setSelectedStream: (streamId: string | null) => void;
  setCreatingStream: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  expandedStreams: new Set<string>(),
  editingCardId: null,
  selectedStreamId: null,
  isCreatingStream: false,

  toggleStreamExpand: (streamId) =>
    set((state) => {
      const next = new Set(state.expandedStreams);
      if (next.has(streamId)) {
        next.delete(streamId);
      } else {
        next.add(streamId);
      }
      return { expandedStreams: next };
    }),

  setEditingCard: (cardId) => set({ editingCardId: cardId }),
  setSelectedStream: (streamId) => set({ selectedStreamId: streamId }),
  setCreatingStream: (value) => set({ isCreatingStream: value }),
}));
