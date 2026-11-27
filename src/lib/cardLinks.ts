import { db, cards, cardLinks } from "@/db";
import { and, eq, inArray, or } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { Card, CardLink, CardMetadata, CardWithRelations } from "@/types";
import { isCycleIntroduced } from "@/lib/linkGraph";

type TransactionClient = typeof db;

/**
 * Deterministic ordering for cards: createdAt ascending, then id ascending.
 * Used for previous/next arrays, board layout, and modal stacks.
 */
export function compareCards(a: Card, b: Card): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

async function getOwnedCard(cardId: string, userId: string, tx: TransactionClient = db) {
  const results = await tx
    .select()
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .limit(1);
  return results[0] ?? null;
}

/**
 * Attach previous/next arrays to each card in `roster`.
 * Links whose endpoints are not in `roster` are ignored. O(n + links).
 */
export function attachRelations<T extends Card>(
  roster: T[],
  links: CardLink[],
): (T & { previousCards: Card[]; nextCards: Card[] })[] {
  const byId = new Map(roster.map((c) => [c.id, c]));
  const nextMap = new Map<string, Card[]>();
  const prevMap = new Map<string, Card[]>();

  for (const link of links) {
    const source = byId.get(link.sourceCardId);
    const target = byId.get(link.targetCardId);
    if (!source || !target) continue;
    if (!nextMap.has(source.id)) nextMap.set(source.id, []);
    if (!prevMap.has(target.id)) prevMap.set(target.id, []);
    nextMap.get(source.id)!.push(target);
    prevMap.get(target.id)!.push(source);
  }

  for (const list of nextMap.values()) list.sort(compareCards);
  for (const list of prevMap.values()) list.sort(compareCards);

  return roster.map((card) => ({
    ...card,
    previousCards: prevMap.get(card.id) ?? [],
    nextCards: nextMap.get(card.id) ?? [],
  }));
}

/** Cards linked from `cardId` (outgoing). Single grouped query. */
export async function getNextCards(cardId: string, userId: string): Promise<Card[]> {
  const owned = await getOwnedCard(cardId, userId);
  if (!owned) return [];
  const links = await db
    .select()
    .from(cardLinks)
    .where(eq(cardLinks.sourceCardId, cardId));
  const targetIds = links.map((l: CardLink) => l.targetCardId);
  if (targetIds.length === 0) return [];
  const targets = await db
    .select()
    .from(cards)
    .where(and(inArray(cards.id, targetIds), eq(cards.userId, userId)));
  return targets.sort(compareCards);
}

/** Cards linking into `cardId` (incoming, reverse join). Single grouped query. */
export async function getPreviousCards(cardId: string, userId: string): Promise<Card[]> {
  const owned = await getOwnedCard(cardId, userId);
  if (!owned) return [];
  const links = await db
    .select()
    .from(cardLinks)
    .where(eq(cardLinks.targetCardId, cardId));
  const sourceIds = links.map((l: CardLink) => l.sourceCardId);
  if (sourceIds.length === 0) return [];
  const sources = await db
    .select()
    .from(cards)
    .where(and(inArray(cards.id, sourceIds), eq(cards.userId, userId)));
  return sources.sort(compareCards);
}

/** Fetch all links touching the given cards (both endpoints in the roster). */
export async function getLinksTouching(cardIds: string[], tx: TransactionClient = db): Promise<CardLink[]> {
  if (cardIds.length === 0) return [] as CardLink[];
  return tx
    .select()
    .from(cardLinks)
    .where(
      or(
        inArray(cardLinks.sourceCardId, cardIds),
        inArray(cardLinks.targetCardId, cardIds),
      ),
    ) as Promise<CardLink[]>;
}

/** Resolve previous/next arrays for a list of cards. Single grouped query. */
export async function getCardsWithRelations(
  roster: Card[],
  txOverride?: TransactionClient,
): Promise<CardWithRelations[]> {
  if (roster.length === 0) return [];
  const links = await getLinksTouching(roster.map((c) => c.id), txOverride ?? db);
  // Keep only links whose endpoints are present in the roster (the roster is
  // already user-scoped by the caller, which guarantees ownership).
  const ownedIds = new Set(roster.map((c) => c.id));
  const scopedLinks = links.filter(
    (l: CardLink) => ownedIds.has(l.sourceCardId) && ownedIds.has(l.targetCardId),
  );
  return attachRelations(roster, scopedLinks) as CardWithRelations[];
}


export class CardLinkError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CardLinkError";
    this.status = status;
  }
}

async function resolveCardWithRelations(
  card: Card,
  links: CardLink[],
  userId: string,
  tx: TransactionClient,
): Promise<CardWithRelations> {
  const relatedIds = new Set<string>([card.id]);
  for (const l of links) {
    relatedIds.add(l.sourceCardId);
    relatedIds.add(l.targetCardId);
  }
  const roster = await tx
    .select()
    .from(cards)
    .where(
      and(inArray(cards.id, [...relatedIds]), eq(cards.userId, userId)),
    );
  const withRelations = attachRelations(roster, links);
  const result = withRelations.find((c) => c.id === card.id);
  if (!result) throw new CardLinkError("Card not found", 404);
  return result as CardWithRelations;
}

export async function addCardLink(
  sourceId: string,
  targetId: string,
  userId: string,
  txOverride?: TransactionClient,
): Promise<CardWithRelations> {
  const run = async (tx: TransactionClient): Promise<CardWithRelations> => {
    if (sourceId === targetId) {
      throw new CardLinkError("Cannot link a card to itself", 400);
    }

    const source = await getOwnedCard(sourceId, userId, tx);
    if (!source) throw new CardLinkError("Source card not found", 404);
    const target = await getOwnedCard(targetId, userId, tx);
    if (!target) throw new CardLinkError("Target card not found", 404);

    if (source.streamId !== target.streamId) {
      throw new CardLinkError("Cards must be in the same stream", 400);
    }

    // Load every link whose source is in the stream (single grouped query) so
    // cycle detection can run in-memory.
    const streamCards = await tx
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.streamId, source.streamId), eq(cards.userId, userId)));
    const streamIds = streamCards.map((c: { id: string }) => c.id);
    const streamLinks = (await tx
      .select()
      .from(cardLinks)
      .where(inArray(cardLinks.sourceCardId, streamIds))) as CardLink[];

    const duplicate = streamLinks.some(
      (l: CardLink) => l.sourceCardId === sourceId && l.targetCardId === targetId,
    );
    if (duplicate) {
      throw new CardLinkError("Cards are already linked", 409);
    }

    if (isCycleIntroduced(sourceId, targetId, streamLinks)) {
      throw new CardLinkError(
        "Cannot connect: target card is one of source card's previous cards",
        409,
      );
    }

    await tx.insert(cardLinks).values({
      id: uuid(),
      sourceCardId: sourceId,
      targetCardId: targetId,
      createdAt: new Date().toISOString(),
    });

    // The source just gained an outgoing link: it is no longer a leaf.
    if (source.isEditable) {
      const completedMetadata: CardMetadata = {
        ...(source.metadata ?? {}),
        status: "completed",
      };
      await tx
        .update(cards)
        .set({ isEditable: false, metadata: completedMetadata })
   
        .where(and(eq(cards.id, sourceId), eq(cards.userId, userId)));
    } else {
      await tx
        .update(cards)
        .set({ isEditable: false })
        .where(and(eq(cards.id, sourceId), eq(cards.userId, userId)));
    }

    const touchingLinks = await getLinksTouching([sourceId], tx);
    const [updated] = await tx
      .select()
      .from(cards)
      .where(and(eq(cards.id, sourceId), eq(cards.userId, userId)))
      .limit(1);
    return resolveCardWithRelations(updated, touchingLinks, userId, tx);
  };

  if (txOverride) return run(txOverride);
  return db.transaction((tx: TransactionClient) => run(tx));
}

export async function removeCardLink(
  sourceId: string,
  targetId: string,
  userId: string,
  txOverride?: TransactionClient,
): Promise<CardWithRelations> {
  const run = async (tx: TransactionClient): Promise<CardWithRelations> => {
    const source = await getOwnedCard(sourceId, userId, tx);
    if (!source) throw new CardLinkError("Source card not found", 404);
    const target = await getOwnedCard(targetId, userId, tx);
    if (!target) throw new CardLinkError("Target card not found", 404);

    const deleted = await tx
      .delete(cardLinks)
      .where(
        and(
          eq(cardLinks.sourceCardId, sourceId),
          eq(cardLinks.targetCardId, targetId),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      throw new CardLinkError("Link not found", 404);
    }

    // If the source now has zero outgoing links, it is a leaf again.
    const remaining = await tx
      .select({ id: cardLinks.id })
      .from(cardLinks)
      .where(eq(cardLinks.sourceCardId, sourceId))
      .limit(1);

    if (remaining.length === 0) {
      await tx
        .update(cards)
        .set({ isEditable: true })
        .where(and(eq(cards.id, sourceId), eq(cards.userId, userId)));
    }

    const touchingLinks = await getLinksTouching([sourceId], tx);
    const [updated] = await tx
      .select()
      .from(cards)
      .where(and(eq(cards.id, sourceId), eq(cards.userId, userId)))
      .limit(1);
    return resolveCardWithRelations(updated, touchingLinks, userId, tx);
  };

  if (txOverride) return run(txOverride);
  return db.transaction((tx: TransactionClient) => run(tx));
}
