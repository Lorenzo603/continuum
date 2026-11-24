import { db, cards, streams } from "@/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { CardMetadata } from "@/types";

type TransactionClient = typeof db;

async function hasOwnedStream(streamId: string, userId: string): Promise<boolean> {
  const ownedStream = await db
    .select({ id: streams.id })
    .from(streams)
    .where(and(eq(streams.id, streamId), eq(streams.userId, userId)))
    .limit(1);

  return ownedStream.length > 0;
}

export async function getCards(streamId: string, userId: string) {
  return db
    .select()
    .from(cards)
    .where(and(eq(cards.streamId, streamId), eq(cards.userId, userId)))
    .orderBy(asc(cards.version));
}

export async function getLatestCard(streamId: string, userId: string) {
  const results = await db
    .select()
    .from(cards)
    .where(
      and(
        eq(cards.streamId, streamId),
        eq(cards.userId, userId),
        eq(cards.isEditable, true),
      ),
    )
    .orderBy(desc(cards.version))
    .limit(1);
  return results[0] ?? null;
}

export async function getCardById(id: string, userId: string) {
  const results = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .limit(1);
  return results[0] ?? null;
}

export async function createCard(data: {
  streamId: string;
  content: string;
  metadata?: CardMetadata | null;
}, userId: string) {
  const streamExists = await hasOwnedStream(data.streamId, userId);
  if (!streamExists) {
    return null;
  }

  const id = uuid();

  // Check if there's already an editable card and mark it non-editable
  const existingEditable = await getLatestCard(data.streamId, userId);
  const version = existingEditable ? existingEditable.version + 1 : 1;
  const completedPreviousMetadata: CardMetadata = {
    ...(existingEditable?.metadata ?? {}),
    status: "completed",
  };

  const values = {
    id,
    userId,
    streamId: data.streamId,
    content: data.content,
    version,
    isEditable: true,
    metadata: data.metadata ?? null,
  };

  return db.transaction(async (tx: TransactionClient) => {
    if (existingEditable) {
      await tx
        .update(cards)
        .set({
          isEditable: false,
          metadata: completedPreviousMetadata,
        })
        .where(and(eq(cards.id, existingEditable.id), eq(cards.userId, userId)));
    }
    const [result] = await tx.insert(cards).values(values).returning();
    return result;
  });
}

export async function updateCard(
  cardId: string,
  userId: string,
  data: { content: string; metadata?: CardMetadata | null },
) {
  const existingCard = await getCardById(cardId, userId);
  if (!existingCard) {
    throw new Error("Card not found");
  }
  if (!existingCard.isEditable) {
    throw new Error("Only the latest card can be edited");
  }

  const [result] = await db
    .update(cards)
    .set({
      content: data.content,
      metadata: data.metadata ?? existingCard.metadata,
    })
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .returning();

  return result;
}

export async function deleteCard(cardId: string, userId: string) {
  const card = await getCardById(cardId, userId);
  if (!card) {
    throw new Error("Card not found");
  }
  if (!card.isEditable) {
    throw new Error("Only the latest card can be deleted");
  }

  return db.transaction(async (tx: TransactionClient) => {
    await tx
      .delete(cards)
      .where(and(eq(cards.id, cardId), eq(cards.userId, userId)));

    const previous = await tx
      .select()
      .from(cards)
      .where(and(eq(cards.streamId, card.streamId), eq(cards.userId, userId)))
      .orderBy(desc(cards.version))
      .limit(1);

    if (previous.length > 0) {
      await tx
        .update(cards)
        .set({ isEditable: true })
        .where(and(eq(cards.id, previous[0].id), eq(cards.userId, userId)));
    }

    return { deleted: true, streamId: card.streamId };
  });
}
