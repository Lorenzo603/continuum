"use client";

import { memo } from "react";
import { CardEditor } from "./CardEditor";
import type { Card } from "@/types";

interface CardItemProps {
  card: Card;
  streamId: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export const CardItem = memo(function CardItem({
  card,
  streamId,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: CardItemProps) {
  if (isEditing && card.isEditable) {
    return (
      <CardEditor
        streamId={streamId}
        cardId={card.id}
        initialContent={card.content}
        initialMetadata={card.metadata}
        onCancel={onCancelEdit}
        onSaved={onCancelEdit}
      />
    );
  }

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
      className={`group/card relative min-w-[280px] max-w-[320px] flex-shrink-0 rounded-lg border transition-all ${
        card.isEditable
          ? "border-primary/40 bg-card shadow-sm hover:shadow-md"
          : "border-border bg-card/60 opacity-80"
      }`}
    >
      <div className="p-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
              v{card.version}
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
              <button
                onClick={onStartEdit}
                className="rounded p-1 text-muted opacity-0 transition-opacity group-hover/card:opacity-100 hover:text-primary hover:bg-primary/10"
                title="Edit card (creates new version)"
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
