/**
 * Unit tests for the cycle-detection DFS in src/lib/linkGraph.ts.
 * A new link (source=S, target=T) is rejected iff T can reach S through
 * existing outgoing links (this also covers S == T).
 */
import { describe, it, expect } from "vitest";
import { isCycleIntroduced } from "@/lib/linkGraph";
import type { CardLink } from "@/types";

function link(sourceCardId: string, targetCardId: string): CardLink {
  return {
    id: `${sourceCardId}->${targetCardId}`,
    sourceCardId,
    targetCardId,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("isCycleIntroduced", () => {
  it("rejects a self-link (S == T) even with no existing links", () => {
    expect(isCycleIntroduced("a", "a", [])).toBe(true);
  });

  it("rejects when T reaches S directly", () => {
    // Existing: T -> S. New link S -> T would close the loop.
    expect(isCycleIntroduced("s", "t", [link("t", "s")])).toBe(true);
  });

  it("rejects when T reaches S through an intermediate card", () => {
    // Existing: T -> m -> S. New link S -> T would close the loop.
    expect(isCycleIntroduced("s", "t", [link("t", "m"), link("m", "s")])).toBe(true);
  });

  it("rejects a long chain loop", () => {
    const links = [link("t", "a"), link("a", "b"), link("b", "s")];
    expect(isCycleIntroduced("s", "t", links)).toBe(true);
  });

  it("allows when T cannot reach S", () => {
    // Existing: T -> u (u is off the path to s). New link S -> T is fine.
    expect(isCycleIntroduced("s", "t", [link("t", "u")])).toBe(false);
  });

  it("allows when there are no links at all", () => {
    expect(isCycleIntroduced("s", "t", [])).toBe(false);
  });

  it("only follows outgoing edges (existing cycle elsewhere does not count)", () => {
    // Existing: s -> m -> s (a pre-existing cycle is impossible under validation,
    // but the check must still only follow outgoing edges from the target).
    const links = [link("s", "m"), link("m", "s")];
    // From t (target) there are no outgoing edges, so adding s -> t is fine.
    expect(isCycleIntroduced("s", "t", links)).toBe(false);
  });

  it("handles diamond paths without re-processing nodes", () => {
    // t -> a -> s, t -> b -> s: S would be reached in two ways
    const links = [link("t", "a"), link("t", "b"), link("a", "s"), link("b", "s")];
    expect(isCycleIntroduced("s", "t", links)).toBe(true);
  });
});
