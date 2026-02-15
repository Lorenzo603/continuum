"use client";

import { useState } from "react";
import { useStreamStore } from "@/stores/streamStore";
import { toast } from "sonner";

interface NewStreamFormProps {
  parentStreamId: string | null;
  onCancel: () => void;
}

export function NewStreamForm({ parentStreamId, onCancel }: NewStreamFormProps) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const { addStream } = useStreamStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await addStream(title.trim(), parentStreamId);
      toast.success(
        parentStreamId ? "Substream created" : "Stream created"
      );
      setTitle("");
      onCancel();
    } catch {
      toast.error("Failed to create stream");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-primary/40 bg-card p-3"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        placeholder={parentStreamId ? "Substream name…" : "Stream name…"}
        className="flex-1 rounded bg-transparent px-2 py-1 text-sm placeholder:text-muted focus:outline-none"
        autoFocus
        disabled={saving}
      />
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create"}
      </button>
    </form>
  );
}
