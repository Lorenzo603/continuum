"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Card } from "@/types";
import { CARD_STATUSES } from "@/types";

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  "in-progress": { dot: "bg-success", bg: "bg-success/10", text: "text-success" },
  "action-required": { dot: "bg-warning", bg: "bg-warning/10", text: "text-warning" },
  "to-update": { dot: "bg-[#f472b6]", bg: "bg-[#f472b6]/10", text: "text-[#f472b6]" },
  waiting: { dot: "bg-primary", bg: "bg-primary/10", text: "text-primary" },
  monitor: { dot: "bg-[#a78bfa]", bg: "bg-[#a78bfa]/10", text: "text-[#a78bfa]" },
  completed: { dot: "bg-muted", bg: "bg-muted/10", text: "text-muted" },
};

/* ── Custom scroll bar for the card strip ── */
function StripScrollbar({ stripRef }: { stripRef: React.RefObject<HTMLDivElement | null> }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbWidth, setThumbWidth] = useState(0);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [visible, setVisible] = useState(false);
  const dragState = useRef({ dragging: false, startX: 0, startScrollLeft: 0 });

  // Sync thumb size and position with strip scroll
  const sync = useCallback(() => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip) return;

    const { scrollWidth, clientWidth, scrollLeft } = strip;
    if (scrollWidth <= clientWidth) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const trackWidth = track?.clientWidth ?? strip.clientWidth;
    const ratio = clientWidth / scrollWidth;
    setThumbWidth(Math.max(ratio * trackWidth, 40));
    setThumbLeft((scrollLeft / scrollWidth) * trackWidth);
  }, [stripRef]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    // Delay initial sync to ensure layout is complete
    requestAnimationFrame(() => sync());
    strip.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(() => sync());
    ro.observe(strip);
    return () => {
      strip.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [stripRef, sync]);

  // Re-sync once track element renders (after visible becomes true)
  useEffect(() => {
    if (visible && trackRef.current) {
      sync();
    }
  }, [visible, sync]);

  const onThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const strip = stripRef.current;
    if (!strip) return;
    dragState.current = { dragging: true, startX: e.clientX, startScrollLeft: strip.scrollLeft };

    const onMouseMove = (ev: MouseEvent) => {
      const { dragging, startX, startScrollLeft } = dragState.current;
      if (!dragging) return;
      const track = trackRef.current;
      if (!strip || !track) return;
      const dx = ev.clientX - startX;
      const scrollRatio = strip.scrollWidth / track.clientWidth;
      strip.scrollLeft = startScrollLeft + dx * scrollRatio;
    };

    const onMouseUp = () => {
      dragState.current.dragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [stripRef]);

  // Click on track to jump
  const onTrackClick = useCallback((e: React.MouseEvent) => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip || !track) return;
    // Ignore clicks on the thumb itself
    if (thumbRef.current?.contains(e.target as Node)) return;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    strip.scrollLeft = ratio * strip.scrollWidth - strip.clientWidth / 2;
  }, [stripRef]);

  if (!visible) return null;

  return (
    <div
      ref={trackRef}
      onClick={onTrackClick}
      className="relative h-2 mt-2 rounded-full bg-border/30 cursor-pointer"
    >
      <div
        ref={thumbRef}
        onMouseDown={onThumbMouseDown}
        className="absolute top-0 h-full rounded-full bg-primary/40 hover:bg-primary/60 active:bg-primary/70 transition-colors cursor-grab active:cursor-grabbing"
        style={{ width: thumbWidth, left: thumbLeft }}
      />
    </div>
  );
}

interface StreamCardsModalProps {
  streamTitle: string;
  cards: Card[];
  onClose: () => void;
}

export function StreamCardsModal({ streamTitle, cards, onClose }: StreamCardsModalProps) {
  // Cards displayed with latest first (rightmost in the strip = most recent)
  // We reverse so the strip shows oldest→newest left→right, and auto-scroll to the right
  const displayCards = cards; // already ordered oldest→newest from the store
  const [selectedId, setSelectedId] = useState<string | null>(
    displayCards.length > 0 ? displayCards[displayCards.length - 1].id : null,
  );
  const stripRef = useRef<HTMLDivElement>(null);

  const selectedCard = displayCards.find((c) => c.id === selectedId) ?? null;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Auto-scroll strip to the right (latest cards) on mount
  useEffect(() => {
    const el = stripRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth;
      });
    }
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[85vh] mx-4 rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/30 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{streamTitle}</h2>
            <p className="text-xs text-muted mt-0.5">
              {cards.length} card{cards.length !== 1 ? "s" : ""} · Click a card to view details
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:text-foreground hover:bg-surface"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section 1: Card strip */}
        <div className="flex-shrink-0 border-b border-border/40 px-6 py-4">
          <div
            ref={stripRef}
            className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
          >
            {displayCards.map((card) => {
              const isSelected = card.id === selectedId;
              const statusColor = card.metadata?.status
                ? STATUS_COLORS[card.metadata.status]
                : null;
              const statusLabel = card.metadata?.status
                ? CARD_STATUSES.find((s) => s.value === card.metadata?.status)?.label
                : null;

              return (
                <button
                  key={card.id}
                  onClick={() => setSelectedId(card.id)}
                  className={`flex-shrink-0 w-[200px] rounded-xl border p-3 text-left transition-all duration-150 ${
                    isSelected
                      ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/30"
                      : "border-border/40 bg-card/60 hover:border-border hover:bg-card/80"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                      isSelected ? "bg-primary/15 text-primary" : "bg-surface text-muted"
                    }`}>
                      {card.version}
                    </span>
                    {card.isEditable && (
                      <span className="text-[9px] font-medium text-primary/70">Latest</span>
                    )}
                    {statusColor && (
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[8px] font-medium ${statusColor.bg} ${statusColor.text}`}>
                        <span className={`h-1 w-1 rounded-full ${statusColor.dot}`} />
                        {statusLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed line-clamp-2 text-foreground/80">
                    {card.content}
                  </p>
                  <p className="mt-1.5 text-[9px] text-muted">
                    {new Date(card.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </button>
              );
            })}
          </div>
          <StripScrollbar stripRef={stripRef} />
        </div>

        {/* Section 2: Card detail */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {selectedCard ? (
            <CardDetail card={selectedCard} formatDate={formatDate} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Select a card above to view its details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Full card detail panel ── */
function CardDetail({ card, formatDate }: { card: Card; formatDate: (iso: string) => string }) {
  const statusColor = card.metadata?.status
    ? STATUS_COLORS[card.metadata.status]
    : null;
  const statusLabel = card.metadata?.status
    ? CARD_STATUSES.find((s) => s.value === card.metadata?.status)?.label
    : null;

  return (
    <div className="max-w-3xl">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
          Version {card.version}
        </span>
        {card.isEditable && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            Latest
          </span>
        )}
        {statusColor && statusLabel && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
            <span className={`h-2 w-2 rounded-full ${statusColor.dot}`} />
            {statusLabel}
          </span>
        )}
        <span className="text-xs text-muted">{formatDate(card.createdAt)}</span>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border/40 bg-surface/30 px-5 py-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{card.content}</p>
      </div>

      {/* Tags */}
      {card.metadata?.tags && card.metadata.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {card.metadata.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
