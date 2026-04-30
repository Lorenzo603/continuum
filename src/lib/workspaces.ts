import { db, workspaces } from "@/db";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function getAllWorkspaces(userId: string) {
  return db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .orderBy(asc(workspaces.orderIndex), asc(workspaces.createdAt));
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
    .orderBy(asc(workspaces.orderIndex), asc(workspaces.createdAt))
    .limit(1);

  return results[0] ?? null;
}

async function getNextWorkspaceOrderIndex(userId: string): Promise<number> {
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(workspaces.orderIndex) })
    .from(workspaces)
    .where(eq(workspaces.userId, userId));

  return (maxOrder ?? -1) + 1;
}

export async function createWorkspace(data: {
  name: string;
  description?: string | null;
}, userId: string) {
  const id = uuid();
  const orderIndex = await getNextWorkspaceOrderIndex(userId);
  const result = db
    .insert(workspaces)
    .values({
      id,
      userId,
      name: data.name,
      description: data.description ?? null,
      orderIndex,
    })
    .returning();
  return (await result)[0];
}

export async function updateWorkspace(
  id: string,
  data: { name?: string; description?: string | null; orderIndex?: number },
  userId: string,
) {
  const result = db
    .update(workspaces)
    .set(data)
    .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
    .returning();
  return (await result)[0] ?? null;
}

export async function reorderWorkspaces(orderedIds: string[], userId: string) {
  if (orderedIds.length === 0) {
    return;
  }

  const ownedWorkspaces = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.userId, userId), inArray(workspaces.id, orderedIds)));

  if (ownedWorkspaces.length !== orderedIds.length) {
    throw new Error("Workspace not found");
  }

  const updates = orderedIds.map((id, index) =>
    db
      .update(workspaces)
      .set({ orderIndex: index })
      .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
  );

  await Promise.all(updates);
}

export async function deleteWorkspace(id: string, userId: string) {
  return db
    .delete(workspaces)
    .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)));
}
