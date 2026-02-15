"use client";

import { useStreams } from "@/hooks/useStreams";
import { useStreamStore } from "@/stores/streamStore";
import { useUIStore } from "@/stores/uiStore";
import { StreamRow } from "./StreamRow";
import { NewStreamForm } from "./NewStreamForm";
import { EmptyState } from "./EmptyState";
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
    <div className="flex flex-col gap-2">
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
          className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted transition-colors hover:border-primary hover:text-primary"
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
        <div className="ml-6 border-l-2 border-border pl-4 mt-1 flex flex-col gap-2">
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
