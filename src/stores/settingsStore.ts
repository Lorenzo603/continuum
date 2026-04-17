import { create } from "zustand";
import type { Settings } from "@/types";

interface SettingsState {
  prepopulateCardContent: boolean;
  loaded: boolean;

  fetchSettings: () => Promise<void>;
  updateSettings: (patch: { prepopulateCardContent: boolean }) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  prepopulateCardContent: true,
  loaded: false,

  fetchSettings: async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data: Settings = await res.json();
      set({
        prepopulateCardContent: data.prepopulateCardContent,
        loaded: true,
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  },

  updateSettings: async (patch) => {
    // Optimistic update
    set({ prepopulateCardContent: patch.prepopulateCardContent });
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      const data: Settings = await res.json();
      set({ prepopulateCardContent: data.prepopulateCardContent });
    } catch (error) {
      // Revert on failure
      set({ prepopulateCardContent: !patch.prepopulateCardContent });
      throw error;
    }
  },
}));
