import type { Card } from "@/types";

export interface CardTreeNode {
  card: Card;
  /** Direct next-cards in the stream (any depth resolved recursively). */
  children: CardTreeNode[];
  depth: number;
  /** All previous cards of the card (0 for roots). */
  previousCount: number;
}

export interface CardLayoutRow {
  card: Card;
  depth: number;
}

function parseCreatedAt(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Deterministic ordering for cards: createdAt ascending, then id ascending.
 */
export function compareCards(a: Card, b: Card): number {
  if (a.createdAt !== b.createdAt) {
    return parseCreatedAt(a.createdAt) - parseCreatedAt(b.createdAt);
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Build the display tree for a stream.
 *
 * Rules:
 * - Roots are cards with no previous card (zero incoming links). In a stream
 *   that is exactly one card (the root), ordered by createdAt/id.
 * - Each non-root card is placed under its earliest-created previous card
 *   (ties broken by id) — a card with multiple previous cards appears once.
 * - Children are ordered by createdAt, then id.
 * - A card whose previous card is absent from the set (e.g. deleted or out of
 *   scope) is treated as a root.
 * - Sibling cards (sharing the same previous card) are therefore rendered one
 *   below the other vertically under their parent.
 */
export function buildCardTree(cardsList: Card[]): CardTreeNode[] {
  const byId = new Map(cardsList.map((c) => [c.id, c]));
  const ordered = [...cardsList].sort(compareCards);

  // Map previous card id -> list of children (each child in sorted order).
  const childMap = new Map<string, Card[]>();
  const roots: Card[] = [];

  for (const card of ordered) {
    const prev = (card as Card & { previousCards?: Card[] }).previousCards ?? [];
    const present = prev.filter((p) => byId.has(p.id));
    if (present.length === 0) {
      roots.push(card);
      continue;
    }
    const parent = [...present].sort(compareCards)[0];
    if (!childMap.has(parent.id)) childMap.set(parent.id, []);
    childMap.get(parent.id)!.push(card);
  }

  function toNode(card: Card, depth: number): CardTreeNode {
    const children = (childMap.get(card.id) ?? []).map((child) => toNode(child, depth + 1));
    return {
      card,
      children,
      depth,
      previousCount: (card as Card & { previousCards?: Card[] }).previousCards?.length ?? 0,
    };
  }

  return roots.map((root) => toNode(root, 0));
}

/**
 * Flatten the tree into a depth-annotated row list, preserving the vertical
 * sibling stacking (parent appears before its children).
 */
export function flattenCardTree(nodes: CardTreeNode[]): CardLayoutRow[] {
  const rows: CardLayoutRow[] = [];
  function visit(node: CardTreeNode) {
    rows.push({ card: node.card, depth: node.depth });
    for (const child of node.children) visit(child);
  }
  for (const node of nodes) visit(node);
  return rows;
}

/**
 * A card is a leaf iff it has zero outgoing "next" links. Prefers the resolved
 * next-cards when present; falls back to the cached isEditable flag.
 */
export function isCardLeaf(card: Card & { nextCards?: Card[] }): boolean {
  const next = card.nextCards;
  if (next !== undefined) return next.length === 0;
  return card.isEditable;
}

/**
 * Returns the newest leaf card in `cards` (zero outgoing links, preferring the
 * resolved next-cards when present), or null when the list is empty. Ties
 * break by id (descending) so the default branch source is deterministic.
 */
export function getNewestLeafCard(cards: Card[]): Card | null {
  if (cards.length === 0) return null;
  const leaves = cards.filter(isCardLeaf);
  const pool = leaves.length > 0 ? leaves : cards;
  return (
    [...pool].sort((a, b) => {
      const diff = parseCreatedAt(b.createdAt) - parseCreatedAt(a.createdAt);
      if (diff !== 0) return diff;
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    })[0] ?? null
  );
}
