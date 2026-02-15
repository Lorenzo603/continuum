"use client";

import { useState, memo } from "react";
import { useCards } from "@/hooks/useCards";
import { useStreamStore } from "@/stores/streamStore";
import { useUIStore } from "@/stores/uiStore";
import { CardItem } from "./CardItem";
import { CardEditor } from "./CardEditor";
import { NewStreamForm } from "./NewStreamForm";
import type { StreamNode } from "@/types";

interface StreamRowProps {
  stream: StreamNode;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
}

export const StreamRow = memo(function StreamRow({
  stream,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onDelete,
}: StreamRowProps) {
  const { cards, loading } = useCards(stream.id);
  const { updateStream } = useStreamStore();
  const { editingCardId, setEditingCard } = useUIStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(stream.title);
  const [showNewCard, setShowNewCard] = useState(false);
  const [isAddingSubstream, setIsAddingSubstream] = useState(false);

  const latestCard = cards.length > 0 ? cards[cards.length - 1] : null;

  const handleTitleSave = () => {
    if (titleDraft.trim() && titleDraft !== stream.title) {
      updateStream(stream.id, { title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="group rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card-hover">
      {/* Stream header */}
      <div className="flex items-center gap-2 mb-3">
        {hasChildren && (
          <button
            onClick={onToggleExpand}
            className="flex-shrink-0 rounded p-0.5 text-muted transition-colors hover:text-foreground"
            aria-label={isExpanded ? "Collapse substreams" : "Expand substreams"}
          >
            <svg
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

        {isEditingTitle ? (
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") {
                setTitleDraft(stream.title);
                setIsEditingTitle(false);
              }
            }}
            className="flex-1 rounded border border-primary bg-transparent px-2 py-0.5 text-sm font-semibold focus:outline-none"
            autoFocus
          />
        ) : (
          <h3
            onDoubleClick={() => setIsEditingTitle(true)}
            className="text-sm font-semibold cursor-default select-none"
            title="Double-click to edit"
          >
            {stream.title}
          </h3>
        )}

        <span className="text-xs text-muted ml-1">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>

        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsAddingSubstream(true)}
            className="rounded p-1 text-muted hover:text-foreground hover:bg-surface transition-colors"
            title="Add substream"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h4l3 9h10m-7-4h7m-3.5-3.5v7" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            title="Delete stream"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cards row - horizontal scroll */}
      <div className="stream-cards-scroll flex gap-3 overflow-x-auto pb-2">
        {loading && cards.length === 0 ? (
          <div className="flex gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 w-72 animate-pulse rounded-lg bg-surface flex-shrink-0"
              />
            ))}
          </div>
        ) : (
          <>
            {cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                streamId={stream.id}
                isEditing={editingCardId === card.id}
                onStartEdit={() => setEditingCard(card.id)}
                onCancelEdit={() => setEditingCard(null)}
              />
            ))}

            {showNewCard ? (
              <CardEditor
                streamId={stream.id}
                onCancel={() => setShowNewCard(false)}
                onSaved={() => setShowNewCard(false)}
              />
            ) : (
              <button
                onClick={() => setShowNewCard(true)}
                className="flex h-28 min-w-[120px] flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted transition-colors hover:border-primary hover:text-primary"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Inline substream form */}
      {isAddingSubstream && (
        <div className="mt-3 ml-6 border-l-2 border-border pl-4">
          <NewStreamForm
            parentStreamId={stream.id}
            onCancel={() => setIsAddingSubstream(false)}
          />
        </div>
      )}
    </div>
  );
});
