"use client";

import { useState, memo } from "react";
import { useCards } from "@/hooks/useCards";
import { useStreamStore } from "@/stores/streamStore";
import { useUIStore } from "@/stores/uiStore";
import { CardItem } from "./CardItem";
import { NewStreamForm } from "./NewStreamForm";
import { StreamCardsModal } from "./StreamCardsModal";
import type { StreamNode, Card } from "@/types";

/**
 * Compact indicator for older card versions, opens the full history modal.
 */
function OlderVersionsIndicator({
  count,
  allCards,
  streamTitle,
}: {
  count: number;
  allCards: Card[];
  streamTitle: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex-shrink-0 self-stretch flex items-center rounded-lg px-4 text-xs text-muted transition-colors hover:text-primary hover:bg-surface cursor-pointer"
      >
        <span className="whitespace-nowrap">
          +{count} older {count === 1 ? "version" : "versions"}
        </span>
      </button>

      {showModal && (
        <StreamCardsModal
          streamTitle={streamTitle}
          cards={allCards}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

interface StreamRowProps {
  stream: StreamNode;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onArchive: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export const StreamRow = memo(function StreamRow({
  stream,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onDelete,
  onArchive,
  dragHandleProps,
}: StreamRowProps) {
  const { cards, loading } = useCards(stream.id);
  const { updateStream } = useStreamStore();
  const openCardEditor = useUIStore((s) => s.openCardEditor);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(stream.title);
  const [isAddingSubstream, setIsAddingSubstream] = useState(false);
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [modalInitialCardId, setModalInitialCardId] = useState<string | null>(null);

  const handleTitleSave = () => {
    if (titleDraft.trim() && titleDraft !== stream.title) {
      updateStream(stream.id, { title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="group">
      {/* Stream header */}
      <div className="flex items-center gap-2 mb-2">
        {/* Drag handle */}
        <button
          {...dragHandleProps}
          className="flex-shrink-0 cursor-grab rounded p-0.5 text-muted/40 transition-colors hover:text-muted active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="5" r="1.5" />
            <circle cx="15" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" />
            <circle cx="15" cy="19" r="1.5" />
          </svg>
        </button>

        {hasChildren && (
          <button
            onClick={onToggleExpand}
            className="cursor-pointer flex-shrink-0 rounded p-0.5 text-muted transition-colors hover:text-foreground"
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
            className="cursor-pointer rounded p-1 text-muted hover:text-foreground hover:bg-surface transition-colors"
            title="Add substream"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h4l3 9h10m-7-4h7m-3.5-3.5v7" />
            </svg>
          </button>
          <button
            onClick={onArchive}
            className="cursor-pointer rounded p-1 text-muted hover:text-warning hover:bg-warning/10 transition-colors"
            title="Archive stream"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="cursor-pointer rounded p-1 text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            title="Delete stream"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cards row - drag to scroll */}
      <div
        className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none"
      >
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
            {/* Collapsed card stack (cards beyond the last 3) */}
            {cards.length > 3 && (
              <OlderVersionsIndicator
                count={cards.length - 3}
                allCards={cards}
                streamTitle={stream.title}
              />
            )}

            {/* Visible cards (last 3, or all if ≤ 3) */}
            {(cards.length > 3 ? cards.slice(-3) : cards).map((card) => (
              <CardItem
                key={card.id}
                card={card}
                streamId={stream.id}
                onViewAll={() => { setModalInitialCardId(card.id); setShowCardsModal(true); }}
              />
            ))}

            <button
              onClick={() => openCardEditor({ streamId: stream.id })}
              className="flex min-h-[60px] min-w-[60px] flex-shrink-0 self-stretch items-center justify-center rounded-lg border border-dashed border-border/40 text-muted/40 transition-colors hover:border-primary/30 hover:text-primary cursor-pointer"
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
          </>
        )}
      </div>

      {/* Inline substream form */}
      {isAddingSubstream && (
        <div className="mt-3 ml-5 border-l-2 border-primary/15 pl-4">
          <NewStreamForm
            parentStreamId={stream.id}
            workspaceId={stream.workspaceId}
            onCancel={() => setIsAddingSubstream(false)}
          />
        </div>
      )}

      {/* Cards modal */}
      {showCardsModal && (
        <StreamCardsModal
          streamTitle={stream.title}
          cards={cards}
          initialCardId={modalInitialCardId}
          onClose={() => { setShowCardsModal(false); setModalInitialCardId(null); }}
        />
      )}
    </div>
  );
});
