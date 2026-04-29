import { db, streams, workspaces } from "@/db";
import { and, asc, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { Stream, StreamNode } from "@/types";

export async function getTopLevelStreams(workspaceId: string, userId: string) {
  return db
    .select()
    .from(streams)
    .where(
      and(
        eq(streams.userId, userId),
        eq(streams.workspaceId, workspaceId),
        isNull(streams.parentStreamId),
        eq(streams.status, "active"),
      ),
    )
    .orderBy(asc(streams.orderIndex));
}

export async function getSubstreams(parentId: string, userId: string) {
  return db
    .select()
    .from(streams)
    .where(
      and(
        eq(streams.parentStreamId, parentId),
        eq(streams.userId, userId),
        eq(streams.status, "active"),
      ),
    )
    .orderBy(asc(streams.orderIndex));
}

export async function getStreamById(id: string, userId: string) {
  const results = await db
    .select()
    .from(streams)
    .where(and(eq(streams.id, id), eq(streams.userId, userId)))
    .limit(1);
  return results[0] ?? null;
}

export async function getStreamByTitle(
  title: string,
  userId: string,
  workspaceId?: string,
) {
  const whereClause = workspaceId
    ? and(
        eq(streams.userId, userId),
        eq(streams.title, title),
        eq(streams.workspaceId, workspaceId),
        eq(streams.status, "active"),
      )
    : and(
        eq(streams.userId, userId),
        eq(streams.title, title),
        eq(streams.status, "active"),
      );

  const results = await db
    .select()
    .from(streams)
    .where(whereClause)
    .orderBy(asc(streams.createdAt))
    .limit(1);

  return results[0] ?? null;
}

export async function getAllStreams(workspaceId: string, userId: string) {
  return db
    .select()
    .from(streams)
    .where(
      and(
        eq(streams.workspaceId, workspaceId),
        eq(streams.userId, userId),
        eq(streams.status, "active"),
      ),
    )
    .orderBy(asc(streams.orderIndex));
}

export async function getStreamTree(workspaceId: string, userId: string): Promise<StreamNode[]> {
  const allStreams: Stream[] = await getAllStreams(workspaceId, userId);

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
  userId: string,
): Promise<number> {
  const parentCondition = parentStreamId
    ? eq(streams.parentStreamId, parentStreamId)
    : isNull(streams.parentStreamId);
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(streams.orderIndex) })
    .from(streams)
    .where(
      and(
        eq(streams.userId, userId),
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
  insertAtStart?: boolean;
}, userId: string) {
  const ownedWorkspace = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, data.workspaceId), eq(workspaces.userId, userId)))
    .limit(1);

  if (ownedWorkspace.length === 0) {
    return null;
  }

  if (data.parentStreamId) {
    const parent = await db
      .select({ workspaceId: streams.workspaceId })
      .from(streams)
      .where(and(eq(streams.id, data.parentStreamId), eq(streams.userId, userId)))
      .limit(1);

    if (parent.length === 0 || parent[0].workspaceId !== data.workspaceId) {
      return null;
    }
  }

  const id = uuid();
  const resolvedParentStreamId = data.parentStreamId ?? null;

  let orderIndex: number;
  if (data.insertAtStart) {
    const parentCondition = resolvedParentStreamId
      ? eq(streams.parentStreamId, resolvedParentStreamId)
      : isNull(streams.parentStreamId);

    await db
      .update(streams)
      .set({
        orderIndex: sql`${streams.orderIndex} + 1`,
      })
      .where(
        and(
          eq(streams.userId, userId),
          eq(streams.workspaceId, data.workspaceId),
          parentCondition,
          eq(streams.status, "active"),
        ),
      );

    orderIndex = 0;
  } else {
    orderIndex = await getNextOrderIndex(
      data.workspaceId,
      resolvedParentStreamId,
      userId,
    );
  }

  const result = db
    .insert(streams)
    .values({
      id,
      userId,
      title: data.title,
      workspaceId: data.workspaceId,
      parentStreamId: resolvedParentStreamId,
      orderIndex,
    })
    .returning();

  return (await result)[0];
}

export async function updateStream(
  id: string,
  data: { title?: string; orderIndex?: number; status?: string },
  userId: string,
) {
  const result = db
    .update(streams)
    .set(data)
    .where(and(eq(streams.id, id), eq(streams.userId, userId)))
    .returning();

  return (await result)[0] ?? null;
}

export async function reorderStreams(orderedIds: string[], userId: string) {
  if (orderedIds.length === 0) {
    return;
  }

  const ownedStreams = await db
    .select({ id: streams.id })
    .from(streams)
    .where(and(eq(streams.userId, userId), inArray(streams.id, orderedIds)));

  if (ownedStreams.length !== orderedIds.length) {
    throw new Error("Stream not found");
  }

  // Update each stream's orderIndex to match its position in the array
  const updates = orderedIds.map((id, index) =>
    db
      .update(streams)
      .set({ orderIndex: index })
      .where(and(eq(streams.id, id), eq(streams.userId, userId)))
  );
  await Promise.all(updates);
}

export async function deleteStream(id: string, userId: string) {
  // Cascade delete is handled by foreign key constraint
  return db
    .delete(streams)
    .where(and(eq(streams.id, id), eq(streams.userId, userId)));
}

export async function archiveStream(id: string, userId: string) {
  const archivedAt = new Date().toISOString();

  // Archive the stream itself
  const result = db
    .update(streams)
    .set({ status: "archived", archivedAt })
    .where(and(eq(streams.id, id), eq(streams.userId, userId)))
    .returning();

  const archived = (await result)[0] ?? null;

  // Recursively archive all descendant substreams
  if (archived) {
    await archiveDescendants(id, archivedAt, userId);
  }

  return archived;
}

async function archiveDescendants(parentId: string, archivedAt: string, userId: string) {
  const children = await db
    .select({ id: streams.id })
    .from(streams)
    .where(and(eq(streams.parentStreamId, parentId), eq(streams.userId, userId)));

  if (children.length === 0) return;

  await db
    .update(streams)
    .set({ status: "archived", archivedAt })
    .where(and(eq(streams.parentStreamId, parentId), eq(streams.userId, userId)));

  for (const child of children) {
    await archiveDescendants(child.id, archivedAt, userId);
  }
}

export async function getArchivedStreams(workspaceId: string, userId: string) {
  // Only show top-level archived streams (whose parent is either null or active)
  const allArchived = await db
    .select()
    .from(streams)
    .where(
      and(
        eq(streams.workspaceId, workspaceId),
        eq(streams.userId, userId),
        eq(streams.status, "archived"),
      ),
    )
    .orderBy(desc(streams.archivedAt));

  // Filter out substreams whose parent is also archived
  const archivedIds = new Set(allArchived.map((s: { id: string }) => s.id));
  return allArchived.filter(
    (s: { parentStreamId: string | null }) => !s.parentStreamId || !archivedIds.has(s.parentStreamId),
  );
}

export async function unarchiveStream(id: string, userId: string) {
  const stream = await getStreamById(id, userId);
  if (!stream) return null;

  const orderIndex = await getNextOrderIndex(
    stream.workspaceId,
    stream.parentStreamId,
    userId,
  );

  const result = db
    .update(streams)
    .set({ status: "active", archivedAt: null, orderIndex })
    .where(and(eq(streams.id, id), eq(streams.userId, userId)))
    .returning();

  const unarchived = (await result)[0] ?? null;

  // Recursively unarchive all descendant substreams
  if (unarchived) {
    await unarchiveDescendants(id, userId);
  }

  return unarchived;
}

async function unarchiveDescendants(parentId: string, userId: string) {
  const children = await db
    .select({ id: streams.id })
    .from(streams)
    .where(and(eq(streams.parentStreamId, parentId), eq(streams.userId, userId)));

  if (children.length === 0) return;

  await db
    .update(streams)
    .set({ status: "active", archivedAt: null })
    .where(and(eq(streams.parentStreamId, parentId), eq(streams.userId, userId)));

  for (const child of children) {
    await unarchiveDescendants(child.id, userId);
  }
}
