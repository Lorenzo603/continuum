import { useMemo } from "react";
import type { StreamNode } from "@/types";
import type { Stream } from "@/types";

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
 * @returns Filtered tree of StreamNode[].
 */
export function filterStreams(
  tree: StreamNode[],
  archivedStreams: Stream[],
  searchQuery: string,
  showArchived: boolean,
): StreamNode[] {
  const query = searchQuery.trim().toLowerCase();

  // Filter active tree
  const filteredActive = query === ""
    ? tree
    : filterTree(tree, query);

  if (!showArchived) {
    return filteredActive;
  }

  // Include matching archived streams as root-level nodes
  const matchingArchived: StreamNode[] = archivedStreams
    .filter((s) => query === "" || s.title.toLowerCase().includes(query))
    .map((s) => ({ ...s, children: [], depth: 0 }));

  return [...filteredActive, ...matchingArchived];
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
 * React hook that returns the filtered stream list based on the current
 * search query and archive toggle from uiStore.
 */
export function useFilteredStreams(
  tree: StreamNode[],
  archivedStreams: Stream[],
  searchQuery: string,
  showArchived: boolean,
): StreamNode[] {
  return useMemo(
    () => filterStreams(tree, archivedStreams, searchQuery, showArchived),
    [tree, archivedStreams, searchQuery, showArchived],
  );
}
