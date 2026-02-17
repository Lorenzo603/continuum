"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { useCards } from "@/hooks/useCards";
import { useStreamStore } from "@/stores/streamStore";
import { useUIStore } from "@/stores/uiStore";
import { CardItem } from "./CardItem";
import { NewStreamForm } from "./NewStreamForm";
import { StreamCardsModal } from "./StreamCardsModal";
import type { StreamNode, Card } from "@/types";

/** Enables click-and-drag horizontal scrolling on a container. */
function useDragScroll(onDragStart?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    // Ignore if clicking on interactive elements
    if ((e.target as HTMLElement).closest("button, textarea, input, a")) return;
    state.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const s = state.current;
    const el = ref.current;
    if (!s.isDown || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - s.startX) * 1.5; // scroll speed multiplier
    el.scrollLeft = s.scrollLeft - walk;
    if (Math.abs(x - s.startX) > 3) {
      if (!s.moved) onDragStartRef.current?.();
      s.moved = true;
    }
  }, []);

  const onMouseUp = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    state.current.isDown = false;
    el.style.cursor = "grab";
    el.style.userSelect = "";
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    state.current.isDown = false;
    el.style.cursor = "";
    el.style.userSelect = "";
  }, []);

  // Set initial grab cursor when content overflows
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      el.style.cursor = el.scrollWidth > el.clientWidth ? "grab" : "";
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
}

const SLIVER_WIDTH = 28; // px visible per collapsed card

/**
 * Renders a compact fanned stack of older cards with a "View All" button
 * that opens the StreamCardsModal.
 */
function CollapsedCardStack({
  cards,
  allCards,
  streamTitle,
}: {
  cards: Card[];
  allCards: Card[];
  streamTitle: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const collapsedWidth = (cards.length - 1) * SLIVER_WIDTH + 64;

  return (
    <>
      <div
        className="relative flex-shrink-0 self-stretch"
        style={{ width: collapsedWidth }}
        title={`${cards.length} older version${cards.length !== 1 ? "s" : ""}`}
      >
        {/* "View All" button */}
        <button
          onClick={() => setShowModal(true)}
          className="absolute inset-0 z-50 flex items-center justify-center cursor-pointer"
        >
          <span className="rounded-full bg-primary/90 px-3 py-1 text-[11px] font-semibold text-white shadow-md backdrop-blur-sm transition-all hover:bg-primary hover:scale-105">
            View all ({cards.length})
          </span>
        </button>

        <div className="relative flex h-full overflow-hidden">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="flex-shrink-0"
              style={{
                width: index < cards.length - 1 ? SLIVER_WIDTH : 64,
                overflow: "hidden",
                zIndex: index,
              }}
            >
              <div className="min-w-[280px] h-full rounded-xl border border-border/60 bg-card/40 opacity-70 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="inline-flex items-center rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-medium text-muted">
                    {card.version}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
  const openCardEditor = useUIStore((s) => s.openCardEditor);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(stream.title);
  const [isAddingSubstream, setIsAddingSubstream] = useState(false);
  const dragScroll = useDragScroll();

  const handleTitleSave = () => {
    if (titleDraft.trim() && titleDraft !== stream.title) {
      updateStream(stream.id, { title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      className="group rounded-xl border border-border/60 border-l-[3px] border-l-primary/30 bg-card p-4 pl-5 shadow-sm transition-all hover:shadow-md hover:border-border/80"
    >
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

        <div className="h-1.5 w-1.5 rounded-full bg-primary/50 flex-shrink-0" />

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

      {/* Cards row - drag to scroll */}
      <div
        ref={dragScroll.ref}
        onMouseDown={dragScroll.onMouseDown}
        onMouseMove={dragScroll.onMouseMove}
        onMouseUp={dragScroll.onMouseUp}
        onMouseLeave={dragScroll.onMouseLeave}
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
              <CollapsedCardStack
                cards={cards.slice(0, cards.length - 3)}
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
              />
            ))}

            <button
              onClick={() => openCardEditor({ streamId: stream.id })}
              className="flex min-h-[80px] min-w-[80px] flex-shrink-0 self-stretch items-center justify-center rounded-xl border-2 border-dashed border-border/40 text-muted/50 transition-all hover:border-primary/40 hover:text-primary hover:bg-primary/5"
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
            onCancel={() => setIsAddingSubstream(false)}
          />
        </div>
      )}
    </div>
  );
});
