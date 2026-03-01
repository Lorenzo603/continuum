"use client";

import { useState, useRef, useEffect } from "react";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  /** Compact mode for inline card editor */
  compact?: boolean;
}

export function TagEditor({ tags, onChange, disabled, compact }: TagEditorProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag || tags.includes(tag)) {
      setInput("");
      return;
    }
    onChange([...tags, tag]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className={compact ? "" : ""}>
      {!compact && (
        <label className="block text-xs font-medium text-muted mb-1.5">
          Tags
        </label>
      )}
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-lg border transition-colors ${
          focused
            ? "border-primary/50 ring-1 ring-primary/30"
            : "border-border/40"
        } ${compact ? "bg-transparent px-0 py-1" : "bg-surface/50 px-3 py-2"}`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/20 hover:text-primary"
                aria-label={`Remove tag ${tag}`}
              >
                <svg
                  className="h-2.5 w-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              if (input.trim()) addTag(input);
            }}
            placeholder={tags.length === 0 ? "Add tags…" : ""}
            className={`flex-1 min-w-[60px] bg-transparent text-xs placeholder:text-muted focus:outline-none ${
              compact ? "py-0" : "py-0.5"
            }`}
          />
        )}
      </div>
      {!compact && (
        <p className="mt-1 text-[10px] text-muted">
          Press Enter or comma to add
        </p>
      )}
    </div>
  );
}
