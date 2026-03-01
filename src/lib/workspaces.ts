import { db, workspaces } from "@/db";
import { eq, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function getAllWorkspaces() {
  return db.select().from(workspaces).orderBy(asc(workspaces.createdAt));
}

export async function getWorkspaceById(id: string) {
  const results = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function createWorkspace(data: {
  name: string;
  description?: string | null;
}) {
  const id = uuid();
  const result = db
    .insert(workspaces)
    .values({
      id,
      name: data.name,
      description: data.description ?? null,
    })
    .returning();
  return (await result)[0];
}

export async function updateWorkspace(
  id: string,
  data: { name?: string; description?: string | null }
) {
  const result = db
    .update(workspaces)
    .set(data)
    .where(eq(workspaces.id, id))
    .returning();
  return (await result)[0] ?? null;
}

export async function deleteWorkspace(id: string) {
  return db.delete(workspaces).where(eq(workspaces.id, id));
}
