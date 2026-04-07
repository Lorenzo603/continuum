"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface WorkspaceViewNavProps {
  workspaceId: string;
}

export function WorkspaceViewNav({ workspaceId }: WorkspaceViewNavProps) {
  const pathname = usePathname();
  const streamsHref = `/workspace/${workspaceId}`;
  const latestCardsHref = `/workspace/${workspaceId}/latest-cards`;
  const showingLatestCards = pathname === latestCardsHref;

  return (
    <nav aria-label="Workspace views" className="mb-3 flex flex-wrap items-center gap-2">
      <Link
        href={streamsHref}
        aria-current={!showingLatestCards ? "page" : undefined}
        className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
          !showingLatestCards
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 bg-card text-muted hover:text-foreground"
        }`}
      >
        Streams
      </Link>
      <Link
        href={latestCardsHref}
        aria-current={showingLatestCards ? "page" : undefined}
        className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
          showingLatestCards
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 bg-card text-muted hover:text-foreground"
        }`}
      >
        Latest Cards
      </Link>
    </nav>
  );
}