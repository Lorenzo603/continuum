import { db, workspaces } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function getAllWorkspaces(userId: string) {
  return db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .orderBy(asc(workspaces.createdAt));
}

export async function getWorkspaceById(id: string, userId: string) {
  const results = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
    .limit(1);
  return results[0] ?? null;
}

export async function getWorkspaceByName(name: string, userId: string) {
  const results = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.name, name), eq(workspaces.userId, userId)))
    .orderBy(asc(workspaces.createdAt))
    .limit(1);

  return results[0] ?? null;
}

export async function createWorkspace(data: {
  name: string;
  description?: string | null;
}, userId: string) {
  const id = uuid();
  const result = db
    .insert(workspaces)
    .values({
      id,
      userId,
      name: data.name,
      description: data.description ?? null,
    })
    .returning();
  return (await result)[0];
}

export async function updateWorkspace(
  id: string,
  data: { name?: string; description?: string | null },
  userId: string,
) {
  const result = db
    .update(workspaces)
    .set(data)
    .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
    .returning();
  return (await result)[0] ?? null;
}

export async function deleteWorkspace(id: string, userId: string) {
  return db
    .delete(workspaces)
    .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)));
}
