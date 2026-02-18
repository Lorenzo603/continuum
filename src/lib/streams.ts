import { db, streams } from "@/db";
import { eq, asc, isNull } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { Stream, StreamNode } from "@/types";

export async function getTopLevelStreams() {
  return db
    .select()
    .from(streams)
    .where(isNull(streams.parentStreamId))
    .orderBy(asc(streams.orderIndex));
}

export async function getSubstreams(parentId: string) {
  return db
    .select()
    .from(streams)
    .where(eq(streams.parentStreamId, parentId))
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

export async function getAllStreams() {
  return db.select().from(streams).orderBy(asc(streams.orderIndex));
}

export async function getStreamTree(): Promise<StreamNode[]> {
  const allStreams: Stream[] = await getAllStreams();

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
  parentStreamId?: string | null;
}) {
  const id = uuid();

  // Determine next orderIndex
  const siblings = data.parentStreamId
    ? await getSubstreams(data.parentStreamId)
    : await getTopLevelStreams();
  const orderIndex = siblings.length;

  const result = db
    .insert(streams)
    .values({
      id,
      title: data.title,
      parentStreamId: data.parentStreamId ?? null,
      orderIndex,
    })
    .returning();

  return (await result)[0];
}

export async function updateStream(
  id: string,
  data: { title?: string; orderIndex?: number }
) {
  const result = db
    .update(streams)
    .set(data)
    .where(eq(streams.id, id))
    .returning();

  return (await result)[0] ?? null;
}

export async function deleteStream(id: string) {
  // Cascade delete is handled by foreign key constraint
  return db.delete(streams).where(eq(streams.id, id));
}
