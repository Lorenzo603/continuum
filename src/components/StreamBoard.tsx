"use client";

import { useStreams } from "@/hooks/useStreams";
import { useStreamStore } from "@/stores/streamStore";
import { useUIStore } from "@/stores/uiStore";
import { StreamRow } from "./StreamRow";
import { NewStreamForm } from "./NewStreamForm";
import { EmptyState } from "./EmptyState";
import { CardEditorModal } from "./CardEditorModal";
import type { StreamNode } from "@/types";

export function StreamBoard() {
  const { streams, loading, error } = useStreams();
  const { deleteStream } = useStreamStore();
  const { isCreatingStream, setCreatingStream } = useUIStore();

  if (loading && streams.length === 0) {
    return <StreamBoardLoadingState />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-6 text-center">
        <p className="text-danger font-medium">Failed to load streams</p>
        <p className="text-sm text-muted mt-1">{error}</p>
      </div>
    );
  }

  if (streams.length === 0 && !isCreatingStream) {
    return <EmptyState onCreateStream={() => setCreatingStream(true)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {streams.map((stream) => (
        <StreamTree key={stream.id} node={stream} onDelete={deleteStream} />
      ))}

      {isCreatingStream ? (
        <NewStreamForm
          onCancel={() => setCreatingStream(false)}
          parentStreamId={null}
        />
      ) : (
        <button
          onClick={() => setCreatingStream(true)}
          className="mt-1 flex items-center gap-2 rounded-xl border-2 border-dashed border-border/50 px-4 py-3.5 text-sm text-muted transition-all hover:border-primary/40 hover:text-primary hover:bg-primary/5"
        >
          <svg
            className="h-4 w-4"
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
          New Stream
        </button>
      )}

      <CardEditorModal />
    </div>
  );
}

function StreamTree({
  node,
  onDelete,
}: {
  node: StreamNode;
  onDelete: (id: string) => void;
}) {
  const { expandedStreams, toggleStreamExpand } = useUIStore();
  const isExpanded = expandedStreams.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <StreamRow
        stream={node}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggleExpand={() => toggleStreamExpand(node.id)}
        onDelete={() => onDelete(node.id)}
      />
      {hasChildren && isExpanded && (
        <div className="ml-5 border-l-2 border-primary/15 pl-4 mt-2 flex flex-col gap-3">
          {node.children.map((child) => (
            <StreamTree key={child.id} node={child} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function StreamBoardLoadingState() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-5 w-40 rounded bg-surface mb-3" />
          <div className="flex gap-4">
            {[1, 2].map((j) => (
              <div
                key={j}
                className="h-32 w-72 rounded-lg bg-surface flex-shrink-0"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
