import { db, streams } from "@/db";
import { eq, asc, isNull, and, desc } from "drizzle-orm";
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

export async function createStream(data: {
  title: string;
  workspaceId: string;
  parentStreamId?: string | null;
}) {
  const id = uuid();

  // Determine next orderIndex
  const siblings = data.parentStreamId
    ? await getSubstreams(data.parentStreamId)
    : await getTopLevelStreams(data.workspaceId);
  const orderIndex = siblings.length;

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
  const result = db
    .update(streams)
    .set({ status: "archived", archivedAt: new Date().toISOString() })
    .where(eq(streams.id, id))
    .returning();

  return (await result)[0] ?? null;
}

export async function getArchivedStreams(workspaceId: string) {
  return db
    .select()
    .from(streams)
    .where(and(eq(streams.workspaceId, workspaceId), eq(streams.status, "archived")))
    .orderBy(desc(streams.archivedAt));
}

export async function unarchiveStream(id: string) {
  const stream = await getStreamById(id);
  if (!stream) return null;

  // Place at the bottom of the active list
  const siblings = stream.parentStreamId
    ? await getSubstreams(stream.parentStreamId)
    : await getTopLevelStreams(stream.workspaceId);
  const orderIndex = siblings.length;

  const result = db
    .update(streams)
    .set({ status: "active", archivedAt: null, orderIndex })
    .where(eq(streams.id, id))
    .returning();

  return (await result)[0] ?? null;
}
