import { db } from "@/db";
import { cards } from "@/db/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { CardMetadata } from "@/types";

export async function getCards(streamId: string) {
  return db
    .select()
    .from(cards)
    .where(eq(cards.streamId, streamId))
    .orderBy(asc(cards.version));
}

export async function getLatestCard(streamId: string) {
  const results = await db
    .select()
    .from(cards)
    .where(and(eq(cards.streamId, streamId), eq(cards.isEditable, true)))
    .orderBy(desc(cards.version))
    .limit(1);
  return results[0] ?? null;
}

export async function getCardById(id: string) {
  const results = await db
    .select()
    .from(cards)
    .where(eq(cards.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function createCard(data: {
  streamId: string;
  content: string;
  metadata?: CardMetadata | null;
}) {
  const id = uuid();

  // Check if there's already an editable card and mark it non-editable
  const existingEditable = await getLatestCard(data.streamId);

  // better-sqlite3 transactions are synchronous
  return db.transaction((tx) => {
    if (existingEditable) {
      tx.update(cards)
        .set({ isEditable: false })
        .where(eq(cards.id, existingEditable.id))
        .run();
    }

    const version = existingEditable ? existingEditable.version + 1 : 1;

    const result = tx
      .insert(cards)
      .values({
        id,
        streamId: data.streamId,
        content: data.content,
        version,
        isEditable: true,
        metadata: data.metadata ?? null,
      })
      .returning()
      .get();

    return result;
  });
}

export async function updateCard(
  cardId: string,
  data: { content: string; metadata?: CardMetadata | null }
) {
  const existingCard = await getCardById(cardId);
  if (!existingCard) {
    throw new Error("Card not found");
  }
  if (!existingCard.isEditable) {
    throw new Error("Only the latest card can be edited");
  }

  const newId = uuid();

  // better-sqlite3 transactions are synchronous
  return db.transaction((tx) => {
    tx.update(cards)
      .set({ isEditable: false })
      .where(eq(cards.id, cardId))
      .run();

    const result = tx
      .insert(cards)
      .values({
        id: newId,
        streamId: existingCard.streamId,
        content: data.content,
        version: existingCard.version + 1,
        isEditable: true,
        metadata: data.metadata ?? existingCard.metadata,
      })
      .returning()
      .get();

    return result;
  });
}
