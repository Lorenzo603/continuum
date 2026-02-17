"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useCardUpdate } from "@/hooks/useCardUpdate";
import { useStreamStore } from "@/stores/streamStore";
import { toast } from "sonner";

export function CardEditorModal() {
  const modal = useUIStore((s) => s.cardEditorModal);
  const closeCardEditor = useUIStore((s) => s.closeCardEditor);

  if (!modal) return null;

  return <CardEditorModalInner key={modal.cardId ?? modal.streamId} />;
}

/** Inner component so hooks only run when the modal is open. */
function CardEditorModalInner() {
  const modal = useUIStore((s) => s.cardEditorModal)!;
  const closeCardEditor = useUIStore((s) => s.closeCardEditor);
  const streams = useStreamStore((s) => s.streams);
  const { handleUpdate, handleCreate } = useCardUpdate();

  const [content, setContent] = useState(modal.initialContent ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const isEditing = !!modal.cardId;
  const streamTitle =
    streams.find((s) => s.id === modal.streamId)?.title ?? "Stream";

  // Focus textarea on mount with cursor at end
  useEffect(() => {
    const t = setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }, 50);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCardEditor();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeCardEditor]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }
    setSaving(true);
    try {
      if (modal.cardId) {
        await handleUpdate(
          modal.cardId,
          modal.streamId,
          content.trim(),
          modal.initialMetadata,
        );
        toast.success("Card updated");
      } else {
        await handleCreate(modal.streamId, content.trim());
        toast.success("Card created");
      }
      closeCardEditor();
    } catch {
      toast.error("Failed to save card");
    } finally {
      setSaving(false);
    }
  }, [content, modal, handleUpdate, handleCreate, closeCardEditor]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      closeCardEditor();
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/30 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">
              {isEditing ? "Edit Card" : "New Card"}
            </h2>
            <p className="text-xs text-muted truncate mt-0.5">
              {streamTitle}
              {isEditing && " · Saving creates a new version"}
            </p>
          </div>
          <button
            onClick={closeCardEditor}
            className="flex-shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:text-foreground hover:bg-surface"
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

        {/* Body */}
        <div className="px-6 py-5">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's the update?"
            rows={8}
            className="w-full resize-none rounded-xl border border-border/40 bg-surface/50 px-4 py-3 text-sm leading-relaxed placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            disabled={saving}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <span className="text-[11px] text-muted">
            Ctrl+Enter to save · Escape to cancel
          </span>
          <div className="flex gap-3">
            <button
              onClick={closeCardEditor}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-foreground hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Saving…" : isEditing ? "Save New Version" : "Create Card"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
