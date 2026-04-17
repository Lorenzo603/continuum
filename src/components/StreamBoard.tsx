"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "./dndModifiers";
import { useStreams } from "@/hooks/useStreams";
import { useFilteredStreams } from "@/hooks/useFilteredStreams";
import { useStreamStore } from "@/stores/streamStore";
import { useCardStore } from "@/stores/cardStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { StreamRow } from "./StreamRow";
import { StreamSearchBar } from "./StreamSearchBar";
import { NewStreamForm } from "./NewStreamForm";
import { EmptyState } from "./EmptyState";
import { CardEditorModal } from "./CardEditorModal";
import { WorkspaceViewNav } from "./WorkspaceViewNav";
import type { Stream, StreamNode } from "@/types";

interface StreamBoardProps {
  workspaceId: string;
}

export function StreamBoard({ workspaceId }: StreamBoardProps) {
  const { streams, loading, error } = useStreams(workspaceId);
  const { deleteStream, archiveStream, unarchiveStream, reorderStreams, archivedStreams } = useStreamStore();
  const { isCreatingStream, setCreatingStream, searchQuery, showArchived, statusFilters } = useUIStore();
  const cardsByStream = useCardStore((s) => s.cardsByStream);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const filteredStreams = useFilteredStreams(streams, archivedStreams, searchQuery, showArchived, statusFilters, cardsByStream);

  // Fetch settings once on mount
  useEffect(() => { if (!settingsLoaded) fetchSettings(); }, [settingsLoaded, fetchSettings]);
  const isFiltering = searchQuery.trim() !== '' || showArchived || statusFilters.size > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = streams.findIndex((s) => s.id === active.id);
      const newIndex = streams.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...streams.map((s) => s.id)];
      reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, active.id as string);

      reorderStreams(null, reordered);
    },
    [streams, reorderStreams]
  );

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

  if (streams.length === 0 && archivedStreams.length === 0 && !isCreatingStream) {
    return (
      <>
        <WorkspaceViewNav workspaceId={workspaceId} />
        <StreamSearchBar />
        <EmptyState onCreateStream={() => setCreatingStream(true)} />
      </>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border/30">
      <div id="stream-board-top" className="flex justify-end pb-2">
        <a
          href="#stream-board-bottom"
          className="text-xs text-muted hover:text-primary transition-colors"
        >
          Jump to bottom ↓
        </a>
      </div>
      <div className="pb-4">
        <WorkspaceViewNav workspaceId={workspaceId} />
        <StreamSearchBar />
        <span className="text-xs text-muted font-medium">{filteredStreams.length} {filteredStreams.length === 1 ? 'stream' : 'streams'}{isFiltering ? ' found' : ''}</span>
      </div>
      {filteredStreams.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted text-sm">No streams match your search.</p>
        </div>
      ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={filteredStreams.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {filteredStreams.map((stream) => (
            <SortableStreamTree
              key={stream.id}
              node={stream}
              onDelete={deleteStream}
              onArchive={archiveStream}
              onReorderChildren={reorderStreams}
            />
          ))}
        </SortableContext>
      </DndContext>
      )}

      {isCreatingStream ? (
        <NewStreamForm
          onCancel={() => setCreatingStream(false)}
          parentStreamId={null}
          workspaceId={workspaceId}
        />
      ) : (
        <button
          onClick={() => setCreatingStream(true)}
          className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border/40 px-4 py-3 text-sm text-muted transition-colors hover:border-primary/30 hover:text-primary cursor-pointer"
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

      {!showArchived && archivedStreams.length > 0 && (
        <ArchivedStreamsSection
          streams={archivedStreams}
          onUnarchive={unarchiveStream}
        />
      )}

      <div id="stream-board-bottom" className="flex justify-end pt-4">
        <a
          href="#stream-board-top"
          className="text-xs text-muted hover:text-primary transition-colors"
        >
          Back to top ↑
        </a>
      </div>
    </div>
  );
}

function SortableStreamTree({
  node,
  onDelete,
  onArchive,
  onReorderChildren,
}: {
  node: StreamNode;
  onDelete: (id: string) => void;
  onArchive: (id: string) => Promise<void>;
  onReorderChildren: (parentStreamId: string | null, orderedIds: string[]) => Promise<void>;
}) {
  const { expandedStreams, toggleStreamExpand } = useUIStore();
  const isExpanded = expandedStreams.has(node.id);
  const hasChildren = node.children.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleChildDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const children = node.children;
      const oldIndex = children.findIndex((s) => s.id === active.id);
      const newIndex = children.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...children.map((s) => s.id)];
      reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, active.id as string);

      onReorderChildren(node.id, reordered);
    },
    [node.children, node.id, onReorderChildren]
  );

  return (
    <div ref={setNodeRef} style={style} className="py-5 first:pt-0">
      <StreamRow
        stream={node}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggleExpand={() => toggleStreamExpand(node.id)}
        onDelete={() => onDelete(node.id)}
        onArchive={() => onArchive(node.id)}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      {hasChildren && isExpanded && (
        <div className="ml-6 border-l border-border/40 pl-5 mt-3 flex flex-col gap-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleChildDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={node.children.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {node.children.map((child) => (
                <SortableStreamTree
                  key={child.id}
                  node={child}
                  onDelete={onDelete}
                  onArchive={onArchive}
                  onReorderChildren={onReorderChildren}
                />
              ))}
            </SortableContext>
          </DndContext>
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

function ArchivedStreamsSection({
  streams,
  onUnarchive,
}: {
  streams: Stream[];
  onUnarchive: (id: string) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-6 border-t border-border/40 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
      >
        <svg
          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <span className="font-medium">Archived Streams</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs">{streams.length}</span>
      </button>

      {isExpanded && (
        <div className="mt-3 flex flex-col gap-2">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-surface/30 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-muted/40 flex-shrink-0" />
                <span className="text-sm text-muted">{stream.title}</span>
                {stream.archivedAt && (
                  <span className="text-xs text-muted/60">
                    archived {new Date(stream.archivedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => onUnarchive(stream.id)}
                className="cursor-pointer rounded px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                title="Unarchive stream"
              >
                Unarchive
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
