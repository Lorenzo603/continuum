import { db, settings } from "@/db";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function getSettings() {
  const rows = await db.select().from(settings).limit(1);
  if (rows.length > 0) return rows[0];

  // Seed default row
  const id = uuid();
  const result = await db
    .insert(settings)
    .values({
      id,
      prepopulateCardContent: true,
    })
    .returning();
  return result[0];
}

export async function updateSettings(patch: {
  prepopulateCardContent?: boolean;
}) {
  const existing = await getSettings();
  const result = await db
    .update(settings)
    .set({
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(settings.id, existing.id))
    .returning();
  return result[0];
}
