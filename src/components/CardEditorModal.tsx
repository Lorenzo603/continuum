"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import type { CardEditorMode } from "@/stores/uiStore";
import { useCardUpdate } from "@/hooks/useCardUpdate";
import { useStreamStore } from "@/stores/streamStore";
import { useCardStore } from "@/stores/cardStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { TagEditor } from "@/components/TagEditor";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { toast } from "sonner";

export function CardEditorModal() {
  const modal = useUIStore((s) => s.cardEditorModal);

  if (!modal) return null;

  return <CardEditorModalInner key={modal.cardId ?? modal.streamId} />;
}

/** Inner component so hooks only run when the modal is open. */
function CardEditorModalInner() {
  const modal = useUIStore((s) => s.cardEditorModal)!;
  const closeCardEditor = useUIStore((s) => s.closeCardEditor);
  const streams = useStreamStore((s) => s.streams);
  const cardsByStream = useCardStore((s) => s.cardsByStream);
  const prepopulateCardContent = useSettingsStore((s) => s.prepopulateCardContent);
  const { handleUpdate, handleCreate } = useCardUpdate();

  // Derive prepopulated values for new cards
  const isNewCard = !modal.cardId;
  const latestCard = (() => {
    if (!isNewCard || !prepopulateCardContent) return null;
    const cards = cardsByStream[modal.streamId];
    if (!cards || cards.length === 0) return null;
    return [...cards].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  })();

  const [content, setContent] = useState(
    modal.initialContent ?? (isNewCard && latestCard ? latestCard.content : ""),
  );
  const [tags, setTags] = useState<string[]>(
    modal.initialMetadata?.tags ?? (isNewCard && latestCard?.metadata?.tags ? latestCard.metadata.tags : []),
  );
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<CardEditorMode>(modal.initialMode ?? "edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const isEditing = !!modal.cardId;
  const streamTitle =
    streams.find((s) => s.id === modal.streamId)?.title ?? "Stream";

  // Focus textarea on mount when in edit mode, or when switching to edit
  useEffect(() => {
    if (mode !== "edit") return;
    const t = setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }, 50);
    return () => clearTimeout(t);
  }, [mode]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) closeCardEditor();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [saving, closeCardEditor]);

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }
    setSaving(true);
    const baseMetadata = modal.initialMetadata ?? (isNewCard && latestCard?.metadata ? latestCard.metadata : undefined);
    const metadata = {
      ...baseMetadata,
      tags: tags.length > 0 ? tags : undefined,
    };
    try {
      if (modal.cardId) {
        await handleUpdate(
          modal.cardId,
          modal.streamId,
          content.trim(),
          metadata,
        );
        toast.success("Card updated");
      } else {
        await handleCreate(modal.streamId, content.trim(), metadata);
        toast.success("Card created");
      }
      closeCardEditor();
    } catch {
      toast.error("Failed to save card");
    } finally {
      setSaving(false);
    }
  }, [content, tags, modal, isNewCard, latestCard, handleUpdate, handleCreate, closeCardEditor]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit Card" : "New Card"}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === backdropRef.current && !saving) closeCardEditor(); }}
    >
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] mx-4 rounded-xl border border-border/50 bg-card shadow-xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">
              {isEditing ? "Edit Card" : "New Card"}
            </h2>
            <p className="text-xs text-muted truncate mt-0.5">
              {streamTitle}
              {isEditing && " · Saving creates a new version"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Mode toggle — only show for existing cards */}
            {isEditing && (
              <ModeToggle mode={mode} onChange={setMode} />
            )}
            <button
              onClick={closeCardEditor}
              className="cursor-pointer flex-shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:text-foreground hover:bg-surface"
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
          {mode === "edit" ? (
            <>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's the update? (Markdown supported)"
                rows={14}
                className="w-full min-h-[200px] resize-y rounded-xl border border-border/40 bg-surface/50 px-4 py-3 text-sm leading-relaxed font-mono placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                disabled={saving}
              />
              <TagEditor tags={tags} onChange={setTags} disabled={saving} />
            </>
          ) : (
            <div className="rounded-xl border border-border/40 bg-surface/30 px-5 py-4">
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4 flex-shrink-0">
          <span className="text-[11px] text-muted">
            {mode === "edit"
              ? "Ctrl+Enter to save · Escape to cancel"
              : "Escape to close"}
          </span>
          <div className="flex gap-3">
            <button
              onClick={closeCardEditor}
              disabled={saving}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-foreground hover:bg-surface"
            >
              {mode === "view" ? "Close" : "Cancel"}
            </button>
            {mode === "edit" && (
              <button
                onClick={handleSave}
                disabled={saving || !content.trim()}
                className="cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving…" : isEditing ? "Save New Version" : "Create Card"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** View / Edit mode toggle. */
function ModeToggle({
  mode,
  onChange,
}: {
  mode: CardEditorMode;
  onChange: (mode: CardEditorMode) => void;
}) {
  return (
    <div
      className="flex rounded-lg border border-border/40 bg-surface/50 p-0.5"
      role="tablist"
      aria-label="Card mode"
    >
      <button
        role="tab"
        aria-selected={mode === "view"}
        onClick={() => onChange("view")}
        className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === "view"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        View
      </button>
      <button
        role="tab"
        aria-selected={mode === "edit"}
        onClick={() => onChange("edit")}
        className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === "edit"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        Markdown Edit
      </button>
    </div>
  );
}
