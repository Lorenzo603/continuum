import type { LatestCardByStream } from "@/lib/latestCards";
import { CARD_STATUSES, type CardStatus } from "@/types";

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  "in-progress": { dot: "bg-success", bg: "bg-success/10", text: "text-success" },
  "action-required": { dot: "bg-warning", bg: "bg-warning/10", text: "text-warning" },
  waiting: { dot: "bg-primary", bg: "bg-primary/10", text: "text-primary" },
  monitor: { dot: "bg-[#9284c8]", bg: "bg-[#9284c8]/10", text: "text-[#9284c8]" },
  "to-update": { dot: "bg-[#c87da0]", bg: "bg-[#c87da0]/10", text: "text-[#c87da0]" },
  completed: { dot: "bg-muted", bg: "bg-muted/10", text: "text-muted" },
  backlog: { dot: "bg-gray-400", bg: "bg-gray-400/10", text: "text-gray-400" },
};

function formatCardDate(value: string): string {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return "Unknown date";
  }

  return new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LatestCardTileProps {
  item: LatestCardByStream;
}

function StatusBadge({ status }: { status: CardStatus }) {
  const colors = STATUS_COLORS[status] ?? {
    dot: "bg-muted",
    bg: "bg-muted/10",
    text: "text-muted",
  };
  const label = CARD_STATUSES.find((s) => s.value === status)?.label ?? status;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
}

export function LatestCardTile({ item }: LatestCardTileProps) {
  const status = item.latestCard.metadata?.status;

  return (
    <article className="mb-4 break-inside-avoid rounded-xl border border-border/50 bg-card/70 p-4 shadow-sm">
      <header className="border-b border-border/40 pb-3">
        <h2 className="text-base font-semibold text-foreground break-words">{item.streamTitle}</h2>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
            v{item.latestCard.version}
          </span>
          {status ? <StatusBadge status={status} /> : null}
        </div>
      </header>

      <p className="pt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
        {item.latestCard.content.trim() || "No content yet"}
      </p>

      <footer className="mt-3 border-t border-border/30 pt-2 text-[10px] text-muted">
        {formatCardDate(item.latestCard.createdAt)}
      </footer>
    </article>
  );
}