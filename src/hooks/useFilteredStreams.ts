import { useMemo } from "react";
import type { StreamNode } from "@/types";
import type { Card, CardStatus, Stream } from "@/types";

/**
 * Filters a hierarchical stream tree by title substring match and archive visibility.
 *
 * - When `searchQuery` is empty, returns the full tree (with archived streams
 *   appended as root-level nodes when `showArchived` is true).
 * - When a parent matches, all its descendants are included.
 * - When a child matches, its ancestor chain up to the root is preserved.
 * - Archived streams from the flat `archivedStreams` list are only included
 *   when `showArchived` is true and their titles match the query.
 *
 * @param tree        The active (non-archived) stream tree from the store.
 * @param archivedStreams  Flat list of archived streams from the store.
 * @param searchQuery Case-insensitive substring to match against stream titles.
 * @param showArchived Whether archived streams should be visible.
 * @param statusFilters Set of card statuses to filter by (empty = no filter).
 * @param cardsByStream Card data keyed by stream ID from the card store.
 * @returns Filtered tree of StreamNode[].
 */
export function filterStreams(
  tree: StreamNode[],
  archivedStreams: Stream[],
  searchQuery: string,
  showArchived: boolean,
  statusFilters: Set<CardStatus>,
  cardsByStream: Record<string, Card[]>,
): StreamNode[] {
  const query = searchQuery.trim().toLowerCase();

  // Filter active tree by search query
  const filteredActive = query === ""
    ? tree
    : filterTree(tree, query);

  let result: StreamNode[];

  if (!showArchived) {
    result = filteredActive;
  } else {
    // Include matching archived streams as root-level nodes
    const matchingArchived: StreamNode[] = archivedStreams
      .filter((s) => query === "" || s.title.toLowerCase().includes(query))
      .map((s) => ({ ...s, children: [], depth: 0 }));

    result = [...filteredActive, ...matchingArchived];
  }

  // Apply status filter if any statuses are selected
  if (statusFilters.size > 0) {
    result = filterTreeByStatus(result, statusFilters, cardsByStream);
  }

  return result;
}

/**
 * Recursively filters a stream tree, keeping nodes whose title matches
 * and preserving ancestor chains for deep matches.
 */
function filterTree(nodes: StreamNode[], query: string): StreamNode[] {
  const result: StreamNode[] = [];

  for (const node of nodes) {
    const titleMatches = node.title.toLowerCase().includes(query);

    if (titleMatches) {
      // Parent matches → include it with ALL descendants
      result.push(node);
    } else {
      // Check children recursively
      const filteredChildren = filterTree(node.children, query);
      if (filteredChildren.length > 0) {
        // A descendant matched → include this ancestor with only matching subtree
        result.push({ ...node, children: filteredChildren });
      }
    }
  }

  return result;
}

/**
 * Returns the status of a stream's latest card, or undefined if no card/status.
 * The latest card is the last element in the array (highest version).
 */
function getLatestCardStatus(
  streamId: string,
  cardsByStream: Record<string, Card[]>,
): CardStatus | undefined {
  const cards = cardsByStream[streamId];
  if (!cards || cards.length === 0) return undefined;
  return cards[cards.length - 1].metadata?.status ?? undefined;
}

/**
 * Recursively filters a stream tree by the latest card's status.
 *
 * - A stream whose latest card status matches any selected filter is kept.
 * - A stream whose cards haven't been loaded yet (undefined in cardsByStream) is kept.
 * - A stream with no cards (empty array) is hidden when a status filter is active.
 * - A parent is kept if any descendant matches (ancestor chain preservation).
 */
function filterTreeByStatus(
  nodes: StreamNode[],
  statusFilters: Set<CardStatus>,
  cardsByStream: Record<string, Card[]>,
): StreamNode[] {
  const result: StreamNode[] = [];

  for (const node of nodes) {
    // Recursively filter children first
    const filteredChildren = filterTreeByStatus(node.children, statusFilters, cardsByStream);

    const cards = cardsByStream[node.id];
    const cardsNotLoaded = cards === undefined;
    const latestStatus = getLatestCardStatus(node.id, cardsByStream);
    const statusMatches = latestStatus !== undefined && statusFilters.has(latestStatus);

    if (statusMatches || cardsNotLoaded) {
      // Stream matches or cards not yet loaded — keep with all filtered children
      result.push(
        filteredChildren.length !== node.children.length
          ? { ...node, children: filteredChildren }
          : node,
      );
    } else if (filteredChildren.length > 0) {
      // A descendant matched — preserve ancestor chain
      result.push({ ...node, children: filteredChildren });
    }
    // Otherwise: stream doesn't match and no descendants match → excluded
  }

  return result;
}

/**
 * React hook that returns the filtered stream list based on the current
 * search query, archive toggle, and status filters from uiStore.
 */
export function useFilteredStreams(
  tree: StreamNode[],
  archivedStreams: Stream[],
  searchQuery: string,
  showArchived: boolean,
  statusFilters: Set<CardStatus>,
  cardsByStream: Record<string, Card[]>,
): StreamNode[] {
  return useMemo(
    () => filterStreams(tree, archivedStreams, searchQuery, showArchived, statusFilters, cardsByStream),
    [tree, archivedStreams, searchQuery, showArchived, statusFilters, cardsByStream],
  );
}
