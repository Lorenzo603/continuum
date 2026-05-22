"use client";

import { useEffect, useRef } from "react";

interface ConfirmDeleteModalProps {
  entityType: "card" | "stream" | "workspace";
  entityName?: string;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export function ConfirmDeleteModal({
  entityType,
  entityName,
  onCancel,
  onConfirm,
  isProcessing = false,
}: ConfirmDeleteModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isProcessing) {
        onCancel();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isProcessing, onCancel]);

  const message = entityName
    ? `This will permanently delete this ${entityType}: "${entityName}".`
    : `This will permanently delete this ${entityType}.`;

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label="Delete confirmation"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 animate-in fade-in duration-150"
      onClick={(event) => {
        if (event.target === backdropRef.current && !isProcessing) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-card p-5 shadow-xl animate-in zoom-in-95 duration-200 mx-4">
        <h2 className="text-lg font-semibold text-foreground">Are you sure?</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="cursor-pointer rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="cursor-pointer rounded-lg bg-danger px-3.5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
