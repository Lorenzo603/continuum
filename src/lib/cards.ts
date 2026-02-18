import { db, cards, DB_TYPE } from "@/db";
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
  const version = existingEditable ? existingEditable.version + 1 : 1;

  const values = {
    id,
    streamId: data.streamId,
    content: data.content,
    version,
    isEditable: true,
    metadata: data.metadata ?? null,
  };

  if (DB_TYPE === "sqlite") {
    // better-sqlite3: synchronous transaction with .run() / .get()
    return db.transaction((tx: any) => {
      if (existingEditable) {
        tx.update(cards)
          .set({ isEditable: false })
          .where(eq(cards.id, existingEditable.id))
          .run();
      }
      return tx.insert(cards).values(values).returning().get();
    });
  }

  // PostgreSQL: async transaction
  return db.transaction(async (tx: any) => {
    if (existingEditable) {
      await tx
        .update(cards)
        .set({ isEditable: false })
        .where(eq(cards.id, existingEditable.id));
    }
    const [result] = await tx.insert(cards).values(values).returning();
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

  const [result] = await db
    .update(cards)
    .set({
      content: data.content,
      metadata: data.metadata ?? existingCard.metadata,
    })
    .where(eq(cards.id, cardId))
    .returning();

  return result;
}

export async function deleteCard(cardId: string) {
  const card = await getCardById(cardId);
  if (!card) {
    throw new Error("Card not found");
  }
  if (!card.isEditable) {
    throw new Error("Only the latest card can be deleted");
  }

  if (DB_TYPE === "sqlite") {
    // better-sqlite3: synchronous transaction
    return db.transaction((tx: any) => {
      tx.delete(cards).where(eq(cards.id, cardId)).run();

      const previous = tx
        .select()
        .from(cards)
        .where(eq(cards.streamId, card.streamId))
        .orderBy(desc(cards.version))
        .limit(1)
        .all();

      if (previous.length > 0) {
        tx.update(cards)
          .set({ isEditable: true })
          .where(eq(cards.id, previous[0].id))
          .run();
      }

      return { deleted: true, streamId: card.streamId };
    });
  }

  // PostgreSQL: async transaction
  return db.transaction(async (tx: any) => {
    await tx.delete(cards).where(eq(cards.id, cardId));

    const previous = await tx
      .select()
      .from(cards)
      .where(eq(cards.streamId, card.streamId))
      .orderBy(desc(cards.version))
      .limit(1);

    if (previous.length > 0) {
      await tx
        .update(cards)
        .set({ isEditable: true })
        .where(eq(cards.id, previous[0].id));
    }

    return { deleted: true, streamId: card.streamId };
  });
}
