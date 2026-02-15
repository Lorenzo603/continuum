"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { useCards } from "@/hooks/useCards";
import { useStreamStore } from "@/stores/streamStore";
import { useUIStore } from "@/stores/uiStore";
import { CardItem } from "./CardItem";
import { CardEditor } from "./CardEditor";
import { NewStreamForm } from "./NewStreamForm";
import type { StreamNode, Card } from "@/types";

/** Enables click-and-drag horizontal scrolling on a container. */
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

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
    if (Math.abs(x - s.startX) > 3) s.moved = true;
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
const CARD_WIDTH = 280;
const CARD_GAP = 12;

/**
 * Renders a compact fanned stack of older cards, like holding playing cards.
 * Hovering any card-sliver unfurls the entire stack at full width and scrolls
 * the parent row so the hovered card is centered under the cursor.
 */
function CollapsedCardStack({
  cards,
  parentScrollRef,
  expanded,
  setExpanded,
}: {
  cards: Card[];
  parentScrollRef: React.RefObject<HTMLDivElement | null>;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  const collapsedWidth = (cards.length - 1) * SLIVER_WIDTH + 64;
  const expandedWidth = cards.length * CARD_WIDTH + (cards.length - 1) * CARD_GAP;
  const stackWidth = expanded ? expandedWidth : collapsedWidth;

  const scrollParentToCard = useCallback(
    (index: number, cursorClientX?: number) => {
      const parent = parentScrollRef.current;
      const stack = stackRef.current;
      if (!parent || !stack) return;

      // Card's position within the stack
      const cardOffsetInStack = index * (CARD_WIDTH + CARD_GAP);
      // Stack's position within the scrollable parent's content
      const stackOffsetInParent = stack.offsetLeft;
      // Absolute card center within parent content
      const cardCenterInParent = stackOffsetInParent + cardOffsetInStack + CARD_WIDTH / 2;

      // Determine anchor: use cursor position relative to parent, or parent center
      let anchor = parent.clientWidth / 2;
      if (cursorClientX !== undefined) {
        const parentRect = parent.getBoundingClientRect();
        anchor = cursorClientX - parentRect.left;
      }

      const target = cardCenterInParent - anchor;
      parent.scrollTo({
        left: Math.max(0, Math.min(target, parent.scrollWidth - parent.clientWidth)),
        behavior: expanded ? "smooth" : "instant",
      });
    },
    [expanded, parentScrollRef],
  );

  const handleCardHover = useCallback(
    (index: number, e: React.MouseEvent) => {
      setHoveredIndex(index);

      // Only scroll on the initial unfurl — not while already expanded
      if (!expanded) {
        const cursorX = e.clientX;
        setExpanded(true);
        requestAnimationFrame(() => {
          scrollParentToCard(index, cursorX);
        });
      }
    },
    [expanded, setExpanded, scrollParentToCard],
  );

  return (
    <div
      ref={stackRef}
      className="relative flex-shrink-0 self-stretch"
      style={{ width: stackWidth, transition: "width 0.3s ease" }}
      title={
        expanded
          ? undefined
          : `${cards.length} older version${cards.length !== 1 ? "s" : ""} — hover to expand`
      }
    >
      {/* Card count badge */}
      {!expanded && (
        <div className="absolute top-1 left-1 z-50 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-2 text-[10px] font-bold text-white shadow">
          {cards.length}
        </div>
      )}

      <div
        className="relative flex h-full overflow-hidden"
        style={{
          gap: expanded ? `${CARD_GAP}px` : "0px",
          transition: "gap 0.3s ease",
        }}
      >
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="flex-shrink-0 transition-all duration-300"
            style={{
              width: expanded ? CARD_WIDTH : index < cards.length - 1 ? SLIVER_WIDTH : 64,
              overflow: "hidden",
              zIndex: expanded ? 0 : index,
              cursor: expanded ? "default" : "pointer",
            }}
            onMouseEnter={(e) => handleCardHover(index, e)}
          >
            <div
              className={`min-w-[280px] h-full rounded-xl border p-3 transition-all duration-300 ${
                expanded
                  ? hoveredIndex === index
                    ? "border-primary/40 bg-card/80 opacity-100 shadow-sm"
                    : "border-border bg-card/60 opacity-85"
                  : "border-border/60 bg-card/40 opacity-70"
              }`}
            >
              {/* Mini header */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="inline-flex items-center rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-medium text-muted">
                  {card.version}
                </span>
                {card.metadata?.status && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      card.metadata.status === "active"
                        ? "bg-success"
                        : card.metadata.status === "completed"
                          ? "bg-primary"
                          : "bg-muted"
                    }`}
                  />
                )}
              </div>
              {/* Content preview (only visible when expanded) */}
              {expanded && (
                <p className="text-xs leading-relaxed line-clamp-3 text-muted">
                  {card.content}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const { editingCardId, setEditingCard } = useUIStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(stream.title);
  const [showNewCard, setShowNewCard] = useState(false);
  const [isAddingSubstream, setIsAddingSubstream] = useState(false);
  const [stackExpanded, setStackExpanded] = useState(false);
  const dragScroll = useDragScroll();

  const latestCard = cards.length > 0 ? cards[cards.length - 1] : null;

  const handleTitleSave = () => {
    if (titleDraft.trim() && titleDraft !== stream.title) {
      updateStream(stream.id, { title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      className="group rounded-xl border border-border/60 border-l-[3px] border-l-primary/30 bg-card p-4 pl-5 shadow-sm transition-all hover:shadow-md hover:border-border/80"
      onMouseLeave={() => setStackExpanded(false)}
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
                parentScrollRef={dragScroll.ref}
                expanded={stackExpanded}
                setExpanded={setStackExpanded}
              />
            )}

            {/* Visible cards (last 3, or all if ≤ 3) */}
            {(cards.length > 3 ? cards.slice(-3) : cards).map((card) => (
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
            )}
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
