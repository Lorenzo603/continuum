import { create } from "zustand";
import type { CardMetadata, CardStatus } from "@/types";

export type CardEditorMode = "view" | "edit";

export interface CardEditorModalState {
  streamId: string;
  cardId?: string;
  initialContent?: string;
  initialMetadata?: CardMetadata | null;
  initialMode?: CardEditorMode;
}

interface UIState {
  expandedStreams: Set<string>;
  editingCardId: string | null;
  selectedStreamId: string | null;
  isCreatingStream: boolean;
  cardEditorModal: CardEditorModalState | null;
  searchQuery: string;
  showArchived: boolean;
  statusFilters: Set<CardStatus>;

  toggleStreamExpand: (streamId: string) => void;
  setEditingCard: (cardId: string | null) => void;
  setSelectedStream: (streamId: string | null) => void;
  setCreatingStream: (value: boolean) => void;
  openCardEditor: (modal: CardEditorModalState) => void;
  closeCardEditor: () => void;
  setSearchQuery: (query: string) => void;
  setShowArchived: (show: boolean) => void;
  toggleStatusFilter: (status: CardStatus) => void;
  clearStatusFilters: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  expandedStreams: new Set<string>(),
  editingCardId: null,
  selectedStreamId: null,
  isCreatingStream: false,
  cardEditorModal: null,
  searchQuery: "",
  showArchived: false,
  statusFilters: new Set<CardStatus>(),

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
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowArchived: (show) => set({ showArchived: show }),
  toggleStatusFilter: (status) =>
    set((state) => {
      const next = new Set(state.statusFilters);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return { statusFilters: next };
    }),
  clearStatusFilters: () => set({ statusFilters: new Set<CardStatus>() }),
}));
