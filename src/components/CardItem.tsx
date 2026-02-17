"use client";

import { memo } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useCardStore } from "@/stores/cardStore";
import { toast } from "sonner";
import type { Card } from "@/types";

interface CardItemProps {
  card: Card;
  streamId: string;
}

export const CardItem = memo(function CardItem({
  card,
  streamId,
}: CardItemProps) {
  const openCardEditor = useUIStore((s) => s.openCardEditor);
  const deleteCard = useCardStore((s) => s.deleteCard);

  const handleDelete = async () => {
    try {
      await deleteCard(card.id, streamId);
      toast.success("Card deleted");
    } catch {
      toast.error("Failed to delete card");
    }
  };

  const statusColors: Record<string, string> = {
    active: "bg-success",
    completed: "bg-primary",
    archived: "bg-muted",
  };

  const formattedDate = new Date(card.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`group/card relative min-w-[280px] max-w-[320px] flex-shrink-0 self-stretch rounded-xl border transition-all duration-200 ${
        card.isEditable
          ? "border-primary/30 bg-card shadow-md shadow-primary/5 hover:shadow-lg hover:shadow-primary/10"
          : "border-border/40 bg-card/40"
      }`}
    >
      <div className="p-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
              {card.version}
            </span>
            {card.metadata?.status && (
              <span
                className={`h-2 w-2 rounded-full ${statusColors[card.metadata.status] ?? "bg-muted"}`}
                title={card.metadata.status}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            {card.isEditable ? (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() =>
                    openCardEditor({
                      streamId,
                      cardId: card.id,
                      initialContent: card.content,
                      initialMetadata: card.metadata,
                    })
                  }
                  className="rounded p-1 text-muted opacity-0 transition-opacity group-hover/card:opacity-100 hover:text-primary hover:bg-primary/10"
                  title="Edit card"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded p-1 text-muted opacity-0 transition-opacity group-hover/card:opacity-100 hover:text-danger hover:bg-danger/10"
                  title="Delete card"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <span
                className="text-muted"
                title="Historical card (read-only)"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed line-clamp-4">{card.content}</p>

        {/* Tags */}
        {card.metadata?.tags && card.metadata.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {card.metadata.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-2 text-[10px] text-muted">{formattedDate}</div>
      </div>
    </div>
  );
});
