import type { CardLink } from "@/types";

/**
 * Pure graph primitives for card links — no database, no I/O.
 *
 * A new link (source=S, target=T) is rejected if T can reach S through
 * existing outgoing links. DFS from T along outgoing edges; reject if it
 * reaches S — this also covers S == T.
 */
export function isCycleIntroduced(
  sourceId: string,
  targetId: string,
  links: CardLink[],
): boolean {
  if (sourceId === targetId) return true;
  const adjacency = new Map<string, string[]>();
  for (const link of links) {
    const list = adjacency.get(link.sourceCardId);
    if (list) list.push(link.targetCardId);
    else adjacency.set(link.sourceCardId, [link.targetCardId]);
  }
  const visited = new Set<string>();
  const stack = [targetId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) stack.push(next);
    }
  }
  return false;
}
