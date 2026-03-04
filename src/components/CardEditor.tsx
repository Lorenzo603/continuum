"use client";

import { useState, useRef, useEffect } from "react";
import { useCardUpdate } from "@/hooks/useCardUpdate";
import { TagEditor } from "@/components/TagEditor";
import { toast } from "sonner";
import type { CardMetadata } from "@/types";

interface CardEditorProps {
  streamId: string;
  cardId?: string;
  initialContent?: string;
  initialMetadata?: CardMetadata | null;
  onCancel: () => void;
  onSaved: () => void;
}

export function CardEditor({
  streamId,
  cardId,
  initialContent = "",
  initialMetadata,
  onCancel,
  onSaved,
}: CardEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialMetadata?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { handleUpdate, handleCreate } = useCardUpdate();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }
    const metadata: CardMetadata = {
      ...initialMetadata,
      tags: tags.length > 0 ? tags : undefined,
    };
    setSaving(true);
    try {
      if (cardId) {
        await handleUpdate(cardId, streamId, content.trim(), metadata);
        toast.success("New card version created");
      } else {
        await handleCreate(streamId, content.trim(), metadata);
        toast.success("Card created");
      }
      onSaved();
    } catch {
      toast.error("Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="min-w-[280px] max-w-[320px] flex-shrink-0 rounded-xl border-2 border-primary/50 bg-card p-3 shadow-lg shadow-primary/10">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's the update?"
        rows={4}
        className="w-full resize-none rounded bg-transparent text-sm leading-relaxed placeholder:text-muted focus:outline-none"
        disabled={saving}
      />
      <TagEditor tags={tags} onChange={setTags} disabled={saving} compact />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted">
          {cardId ? "Saving creates a new version" : "New card"} · Ctrl+Enter to
          save
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="cursor-pointer rounded px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="cursor-pointer rounded bg-primary px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
