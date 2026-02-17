import { create } from "zustand";
import type { CardMetadata } from "@/types";

export interface CardEditorModalState {
  streamId: string;
  cardId?: string;
  initialContent?: string;
  initialMetadata?: CardMetadata | null;
}

interface UIState {
  expandedStreams: Set<string>;
  editingCardId: string | null;
  selectedStreamId: string | null;
  isCreatingStream: boolean;
  cardEditorModal: CardEditorModalState | null;

  toggleStreamExpand: (streamId: string) => void;
  setEditingCard: (cardId: string | null) => void;
  setSelectedStream: (streamId: string | null) => void;
  setCreatingStream: (value: boolean) => void;
  openCardEditor: (modal: CardEditorModalState) => void;
  closeCardEditor: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  expandedStreams: new Set<string>(),
  editingCardId: null,
  selectedStreamId: null,
  isCreatingStream: false,
  cardEditorModal: null,

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
  openCardEditor: (modal) => set({ cardEditorModal: modal }),
  closeCardEditor: () => set({ cardEditorModal: null }),
}));
