import { db, streams } from "@/db";
import { eq, asc, isNull, and, desc, max } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { Stream, StreamNode } from "@/types";

export async function getTopLevelStreams(workspaceId: string) {
  return db
    .select()
    .from(streams)
    .where(
      and(
        eq(streams.workspaceId, workspaceId),
        isNull(streams.parentStreamId),
        eq(streams.status, "active"),
      ),
    )
    .orderBy(asc(streams.orderIndex));
}

export async function getSubstreams(parentId: string) {
  return db
    .select()
    .from(streams)
    .where(and(eq(streams.parentStreamId, parentId), eq(streams.status, "active")))
    .orderBy(asc(streams.orderIndex));
}

export async function getStreamById(id: string) {
  const results = await db
    .select()
    .from(streams)
    .where(eq(streams.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function getAllStreams(workspaceId: string) {
  return db
    .select()
    .from(streams)
    .where(and(eq(streams.workspaceId, workspaceId), eq(streams.status, "active")))
    .orderBy(asc(streams.orderIndex));
}

export async function getStreamTree(workspaceId: string): Promise<StreamNode[]> {
  const allStreams: Stream[] = await getAllStreams(workspaceId);

  const childrenMap = new Map<string | null, Stream[]>();
  for (const stream of allStreams) {
    const parentId = stream.parentStreamId;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(stream);
  }

  function buildTree(parentId: string | null, depth: number): StreamNode[] {
    const children: Stream[] = childrenMap.get(parentId) ?? [];
    return children.map((stream) => ({
      ...stream,
      depth,
      children: buildTree(stream.id, depth + 1),
    }));
  }

  return buildTree(null, 0);
}

async function getNextOrderIndex(
  workspaceId: string,
  parentStreamId: string | null,
): Promise<number> {
  const parentCondition = parentStreamId
    ? eq(streams.parentStreamId, parentStreamId)
    : isNull(streams.parentStreamId);
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(streams.orderIndex) })
    .from(streams)
    .where(
      and(
        eq(streams.workspaceId, workspaceId),
        parentCondition,
        eq(streams.status, "active"),
      ),
    );
  return (maxOrder ?? -1) + 1;
}

export async function createStream(data: {
  title: string;
  workspaceId: string;
  parentStreamId?: string | null;
}) {
  const id = uuid();
  const orderIndex = await getNextOrderIndex(data.workspaceId, data.parentStreamId ?? null);

  const result = db
    .insert(streams)
    .values({
      id,
      title: data.title,
      workspaceId: data.workspaceId,
      parentStreamId: data.parentStreamId ?? null,
      orderIndex,
    })
    .returning();

  return (await result)[0];
}

export async function updateStream(
  id: string,
  data: { title?: string; orderIndex?: number; status?: string }
) {
  const result = db
    .update(streams)
    .set(data)
    .where(eq(streams.id, id))
    .returning();

  return (await result)[0] ?? null;
}

export async function reorderStreams(orderedIds: string[]) {
  // Update each stream's orderIndex to match its position in the array
  const updates = orderedIds.map((id, index) =>
    db
      .update(streams)
      .set({ orderIndex: index })
      .where(eq(streams.id, id))
  );
  await Promise.all(updates);
}

export async function deleteStream(id: string) {
  // Cascade delete is handled by foreign key constraint
  return db.delete(streams).where(eq(streams.id, id));
}

export async function archiveStream(id: string) {
  const archivedAt = new Date().toISOString();

  // Archive the stream itself
  const result = db
    .update(streams)
    .set({ status: "archived", archivedAt })
    .where(eq(streams.id, id))
    .returning();

  const archived = (await result)[0] ?? null;

  // Recursively archive all descendant substreams
  if (archived) {
    await archiveDescendants(id, archivedAt);
  }

  return archived;
}

async function archiveDescendants(parentId: string, archivedAt: string) {
  const children = await db
    .select({ id: streams.id })
    .from(streams)
    .where(eq(streams.parentStreamId, parentId));

  if (children.length === 0) return;

  await db
    .update(streams)
    .set({ status: "archived", archivedAt })
    .where(eq(streams.parentStreamId, parentId));

  for (const child of children) {
    await archiveDescendants(child.id, archivedAt);
  }
}

export async function getArchivedStreams(workspaceId: string) {
  // Only show top-level archived streams (whose parent is either null or active)
  const allArchived = await db
    .select()
    .from(streams)
    .where(and(eq(streams.workspaceId, workspaceId), eq(streams.status, "archived")))
    .orderBy(desc(streams.archivedAt));

  // Filter out substreams whose parent is also archived
  const archivedIds = new Set(allArchived.map((s: { id: string }) => s.id));
  return allArchived.filter(
    (s: { parentStreamId: string | null }) => !s.parentStreamId || !archivedIds.has(s.parentStreamId),
  );
}

export async function unarchiveStream(id: string) {
  const stream = await getStreamById(id);
  if (!stream) return null;

  const orderIndex = await getNextOrderIndex(stream.workspaceId, stream.parentStreamId);

  const result = db
    .update(streams)
    .set({ status: "active", archivedAt: null, orderIndex })
    .where(eq(streams.id, id))
    .returning();

  const unarchived = (await result)[0] ?? null;

  // Recursively unarchive all descendant substreams
  if (unarchived) {
    await unarchiveDescendants(id);
  }

  return unarchived;
}

async function unarchiveDescendants(parentId: string) {
  const children = await db
    .select({ id: streams.id })
    .from(streams)
    .where(eq(streams.parentStreamId, parentId));

  if (children.length === 0) return;

  await db
    .update(streams)
    .set({ status: "active", archivedAt: null })
    .where(eq(streams.parentStreamId, parentId));

  for (const child of children) {
    await unarchiveDescendants(child.id);
  }
}
