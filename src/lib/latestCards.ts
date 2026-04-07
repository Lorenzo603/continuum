import { db, cards } from "@/db";
import { inArray } from "drizzle-orm";
import { getStreamTree } from "@/lib/streams";
import type { Card, StreamNode } from "@/types";

export interface LatestCardByStream {
  streamId: string;
  streamTitle: string;
  latestCard: Card;
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

function isMoreRecentCard(candidate: Card, current: Card): boolean {
  const candidateTimestamp = parseTimestamp(candidate.createdAt);
  const currentTimestamp = parseTimestamp(current.createdAt);

  if (candidateTimestamp !== null && currentTimestamp !== null && candidateTimestamp !== currentTimestamp) {
    return candidateTimestamp > currentTimestamp;
  }

  if (candidateTimestamp !== null && currentTimestamp === null) {
    return true;
  }

  if (candidateTimestamp === null && currentTimestamp !== null) {
    return false;
  }

  return candidate.id.localeCompare(current.id) > 0;
}

export async function getLatestCardsByWorkspace(workspaceId: string): Promise<LatestCardByStream[]> {
  const streamTree = await getStreamTree(workspaceId);
  const orderedStreams = flattenStreamTree(streamTree);

  if (orderedStreams.length === 0) {
    return [];
  }

  const streamIds = orderedStreams.map((stream) => stream.id);
  const workspaceCards = await db
    .select()
    .from(cards)
    .where(inArray(cards.streamId, streamIds));

  if (workspaceCards.length === 0) {
    return [];
  }

  const latestByStream = new Map<string, Card>();

  for (const card of workspaceCards) {
    const current = latestByStream.get(card.streamId);

    if (!current || isMoreRecentCard(card, current)) {
      latestByStream.set(card.streamId, card);
    }
  }

  return orderedStreams.flatMap((stream) => {
    const latestCard = latestByStream.get(stream.id);

    if (!latestCard) {
      return [];
    }

    return [
      {
        streamId: stream.id,
        streamTitle: stream.title,
        latestCard,
      },
    ];
  });
}