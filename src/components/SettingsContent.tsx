"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";

export function SettingsContent() {
  const prepopulateCardContent = useSettingsStore(
    (s) => s.prepopulateCardContent,
  );
  const loaded = useSettingsStore((s) => s.loaded);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  useEffect(() => {
    if (!loaded) fetchSettings();
  }, [loaded, fetchSettings]);

  const handleToggle = async (checked: boolean) => {
    try {
      await updateSettings({ prepopulateCardContent: checked });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (!loaded) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-48 rounded bg-surface/60" />
        <div className="h-4 w-80 rounded bg-surface/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-card p-5">
        <div className="min-w-0">
          <label
            htmlFor="prepopulate-toggle"
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            Prepopulate new cards
          </label>
          <p className="mt-1 text-xs text-muted leading-relaxed max-w-lg">
            When creating a new card, automatically fill in the content and
            metadata from the most recent card in the same stream.
          </p>
        </div>
        <button
          id="prepopulate-toggle"
          role="switch"
          aria-checked={prepopulateCardContent}
          onClick={() => handleToggle(!prepopulateCardContent)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background ${
            prepopulateCardContent ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              prepopulateCardContent ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
