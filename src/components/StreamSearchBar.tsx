"use client";

import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { CARD_STATUSES } from "@/types";

export function StreamSearchBar() {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const showArchived = useUIStore((s) => s.showArchived);
  const setShowArchived = useUIStore((s) => s.setShowArchived);
  const statusFilters = useUIStore((s) => s.statusFilters);
  const toggleStatusFilter = useUIStore((s) => s.toggleStatusFilter);
  const clearStatusFilters = useUIStore((s) => s.clearStatusFilters);

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!statusDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusDropdownOpen]);

  const activeCount = statusFilters.size;

  return (
    <div className="flex items-center gap-3 pb-4">
      <div className="relative flex-1">
        {/* Search icon */}
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search streams..."
          className="w-full rounded-lg border border-border/50 bg-surface/50 py-2 pl-10 pr-9 text-sm text-foreground placeholder:text-muted/60 transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
        {/* Clear button */}
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted transition-colors hover:text-foreground cursor-pointer"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status filter dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setStatusDropdownOpen((prev) => !prev)}
          aria-label="Filter by card status"
          aria-expanded={statusDropdownOpen}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors cursor-pointer ${
            activeCount > 0
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "border-border/50 bg-surface/50 text-muted hover:text-foreground"
          }`}
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:inline whitespace-nowrap">Status</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-white px-1">
              {activeCount}
            </span>
          )}
        </button>

        {statusDropdownOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-border/50 bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
              <span className="text-xs font-medium text-muted">Filter by status</span>
              {activeCount > 0 && (
                <button
                  onClick={clearStatusFilters}
                  className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="py-1">
              {CARD_STATUSES.map(({ value, label }) => {
                const isSelected = statusFilters.has(value);
                return (
                  <label
                    key={value}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer transition-colors hover:bg-surface/60"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStatusFilter(value)}
                      className="h-3.5 w-3.5 rounded border-border/50 accent-primary cursor-pointer"
                    />
                    <span className={isSelected ? "text-foreground" : "text-muted"}>
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted select-none whitespace-nowrap cursor-pointer">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="h-4 w-4 rounded border-border/50 accent-primary cursor-pointer"
        />
        Show archived
      </label>
    </div>
  );
}
