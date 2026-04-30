import { db, settings } from "@/db";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function getSettings(userId: string) {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  if (rows.length > 0) return rows[0];

  // Seed default row for this user.
  const id = uuid();
  const inserted = await db
    .insert(settings)
    .values({
      id,
      userId,
      prepopulateCardContent: true,
    })
    .onConflictDoNothing({ target: settings.userId })
    .returning();
  if (inserted.length > 0) return inserted[0];

  const fallback = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  return fallback[0];
}

export async function updateSettings(
  userId: string,
  patch: {
  prepopulateCardContent?: boolean;
}) {
  await getSettings(userId);

  const result = await db
    .update(settings)
    .set({
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(settings.userId, userId))
    .returning();

  return result[0] ?? getSettings(userId);
}
