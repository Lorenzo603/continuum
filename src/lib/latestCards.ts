import { db, cards, cardLinks } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { getStreamTree } from "@/lib/streams";
import type { Card, StreamNode } from "@/types";

export interface LeafCardByStream {
  streamId: string;
  streamTitle: string;
  card: Card;
}

function flattenStreamTree(nodes: StreamNode[]): StreamNode[] {
  const ordered: StreamNode[] = [];

  function visit(node: StreamNode) {
    ordered.push(node);
    for (const child of node.children) {
      visit(child);
    }
  }

  for (const node of nodes) {
    visit(node);
  }

  return ordered;
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareCards(a: Card, b: Card): number {
  const aTime = parseTimestamp(a.createdAt);
  const bTime = parseTimestamp(b.createdAt);
  if (aTime !== null && bTime !== null && aTime !== bTime) {
    return aTime - bTime;
  }
  if (aTime !== null && bTime === null) return -1;
  if (aTime === null && bTime !== null) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Returns every leaf card (zero outgoing "next" links) in the workspace,
 * grouped per stream and ordered by stream position (tree order), then by
 * createdAt/id within each stream.
 */
export async function getLeafCardsByWorkspace(
  workspaceId: string,
  userId: string,
): Promise<LeafCardByStream[]> {
  const streamTree = await getStreamTree(workspaceId, userId);
  const orderedStreams = flattenStreamTree(streamTree);

  if (orderedStreams.length === 0) {
    return [];
  }

  const streamIds = orderedStreams.map((stream) => stream.id);
  const workspaceCards = await db
    .select()
    .from(cards)
    .where(and(inArray(cards.streamId, streamIds), eq(cards.userId, userId)));

  if (workspaceCards.length === 0) {
    return [];
  }

  // A leaf card has no outgoing link. Load all links touching the cards once.
  const allLinks = await db
    .select({ sourceCardId: cardLinks.sourceCardId })
    .from(cardLinks)
    .where(inArray(cardLinks.sourceCardId, workspaceCards.map((c: Card) => c.id)));
  const nonLeafIds = new Set(allLinks.map((l: { sourceCardId: string }) => l.sourceCardId));

  const cardsByStream = new Map<string, Card[]>();
  for (const card of workspaceCards) {
    if (nonLeafIds.has(card.id)) continue;
    const list = cardsByStream.get(card.streamId) ?? [];
    list.push(card);
    cardsByStream.set(card.streamId, list);
  }

  const result: LeafCardByStream[] = [];
  for (const stream of orderedStreams) {
    const streamCards = (cardsByStream.get(stream.id) ?? []).sort(compareCards);
    for (const card of streamCards) {
      result.push({ streamId: stream.id, streamTitle: stream.title, card });
    }
  }

  return result;
}
