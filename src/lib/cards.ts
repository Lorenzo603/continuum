import { db, cards, streams, cardLinks } from "@/db";
import { and, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { Card, CardMetadata, CardWithRelations } from "@/types";
import {
  addCardLink,
  compareCards,
  getCardsWithRelations,
  CardLinkError,
} from "@/lib/cardLinks";

type TransactionClient = typeof db;

async function hasOwnedStream(streamId: string, userId: string): Promise<boolean> {
  const ownedStream = await db
    .select({ id: streams.id })
    .from(streams)
    .where(and(eq(streams.id, streamId), eq(streams.userId, userId)))
    .limit(1);

  return ownedStream.length > 0;
}

export async function getCards(streamId: string, userId: string): Promise<CardWithRelations[]> {
  const rows = await db
    .select()
    .from(cards)
    .where(and(eq(cards.streamId, streamId), eq(cards.userId, userId)));
  const sorted = rows.sort(compareCards);
  return getCardsWithRelations(sorted);
}

export async function getCardById(id: string, userId: string): Promise<CardWithRelations | null> {
  const results = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .limit(1);
  if (!results[0]) return null;
  // Resolve previous/next against the whole stream roster so links that
  // touch the card (from either side) are not dropped.
  const streamCards = await db
    .select()
    .from(cards)
    .where(and(eq(cards.streamId, results[0].streamId), eq(cards.userId, userId)));
  const withRelations = await getCardsWithRelations(streamCards);
  return withRelations.find((c) => c.id === id) ?? null;
}

export async function createCard(
  data: {
    streamId: string;
    content: string;
    metadata?: CardMetadata | null;
    sourceCardId?: string;
  },
  userId: string,
): Promise<CardWithRelations | null> {
  const streamExists = await hasOwnedStream(data.streamId, userId);
  if (!streamExists) {
    return null;
  }

  return db.transaction(async (tx: TransactionClient) => {
    const existing = await tx
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.streamId, data.streamId), eq(cards.userId, userId)))
      .limit(1);
    const isRoot = existing.length === 0;

    let source: Card | null = null;
    if (data.sourceCardId) {
      const sourceRows = await tx
        .select()
        .from(cards)
        .where(and(eq(cards.id, data.sourceCardId), eq(cards.userId, userId)))
        .limit(1);
      source = sourceRows[0] ?? null;
      if (!source) {
        throw new CardLinkError("Source card not found", 404);
      }
      if (source.streamId !== data.streamId) {
        throw new CardLinkError("Source card must be in the same stream", 400);
      }
    } else if (!isRoot) {
      throw new CardLinkError(
        "sourceCardId is required when the stream already has cards",
        400,
      );
    }

    const id = uuid();
    const [created] = await tx
      .insert(cards)
      .values({
        id,
        userId,
        streamId: data.streamId,
        content: data.content,
        isEditable: true,
        metadata: data.metadata ?? null,
      })
      .returning();

    if (source) {
      // Link source -> new card inside the same transaction. addCardLink also
      // clears the source's editable/leaf flag and marks it completed.
      await addCardLink(source.id, created.id, userId, tx);
    }

    const streamCards = await tx
      .select()
      .from(cards)
      .where(and(eq(cards.streamId, data.streamId), eq(cards.userId, userId)));
    const withRelations = await getCardsWithRelations(streamCards, tx);
    return withRelations.find((c) => c.id === created.id) ?? (created as CardWithRelations);
  });
}

async function getCardOutgoingLinkCount(cardId: string, tx: TransactionClient = db): Promise<number> {
  const rows = await tx
    .select({ id: cardLinks.id })
    .from(cardLinks)
    .where(eq(cardLinks.sourceCardId, cardId))
    .limit(1);
  return rows.length > 0 ? 1 : 0;
}

export async function updateCard(
  cardId: string,
  userId: string,
  data: { content: string; metadata?: CardMetadata | null },
): Promise<CardWithRelations> {
  const existingCard = await getCardById(cardId, userId);
  if (!existingCard) {
    throw new CardLinkError("Card not found", 404);
  }
  const outgoing = await getCardOutgoingLinkCount(cardId);
  if (outgoing > 0) {
    throw new CardLinkError("Card has next links; only leaf cards can be edited", 409);
  }

  const [result] = await db
    .update(cards)
    .set({
      content: data.content,
      metadata: data.metadata ?? existingCard.metadata,
    })
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .returning();

  const streamCards = await db
    .select()
    .from(cards)
    .where(and(eq(cards.streamId, existingCard.streamId), eq(cards.userId, userId)));
  const withRelations = await getCardsWithRelations(streamCards);
  return withRelations.find((c) => c.id === result.id) ?? (result as CardWithRelations);
}

export async function deleteCard(cardId: string, userId: string) {
  const card = await getCardById(cardId, userId);
  if (!card) {
    throw new CardLinkError("Card not found", 404);
  }

  const outgoingLinks = await db
    .select({ id: cardLinks.id })
    .from(cardLinks)
    .where(eq(cardLinks.sourceCardId, cardId))
    .limit(1);
  if (outgoingLinks.length > 0) {
    throw new CardLinkError("Card has next links; only leaf cards can be deleted", 409);
  }

  return db.transaction(async (tx: TransactionClient) => {
    // Find the sources pointing at the deleted card BEFORE the cascade removes
    // the links, so we can re-mark them as editable if they become leaves.
    const incomingLinks = await tx
      .select({ sourceCardId: cardLinks.sourceCardId })
      .from(cardLinks)
      .where(eq(cardLinks.targetCardId, cardId));
    const sourceIds = [...new Set(incomingLinks.map((l: { sourceCardId: string }) => l.sourceCardId))];

    await tx
      .delete(cards)
      .where(and(eq(cards.id, cardId), eq(cards.userId, userId)));

    // Re-mark any source whose outgoing links were entirely to the deleted
    // card: it is a leaf again.
    for (const sourceId of sourceIds) {
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
    }

    return { deleted: true, streamId: card.streamId };
  });
}
