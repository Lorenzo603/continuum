/**
 * Unit tests for src/lib/cardLayout.ts — the pure tree-building logic that
 * renders cards vertically with siblings stacked under their parent.
 */
import { describe, it, expect } from "vitest";
import { buildCardTree, flattenCardTree, compareCards, isCardLeaf, getNewestLeafCard } from "@/lib/cardLayout";
import type { Card } from "@/types";

function fixture(id: string, createdAt: string, previousCards: Card[] = []): Card {
  return {
    id,
    userId: "user-1",
    streamId: "stream-1",
    content: `content-${id}`,
    isEditable: false,
    metadata: null,
    createdAt,
    previousCards,
    nextCards: [],
  } as Card;
}

describe("compareCards", () => {
  it("orders by createdAt ascending", () => {
    const a = fixture("a", "2026-01-01T00:00:00.000Z");
    const b = fixture("b", "2026-01-02T00:00:00.000Z");
    expect(compareCards(a, b)).toBeLessThan(0);
  });

  it("breaks createdAt ties by id", () => {
    const a = fixture("b", "2026-01-01T00:00:00.000Z");
    const b = fixture("a", "2026-01-01T00:00:00.000Z");
    expect(compareCards(a, b)).toBeGreaterThan(0);
    expect(compareCards(b, a)).toBeLessThan(0);
  });

  it("returns 0 for identical cards", () => {
    const a = fixture("a", "2026-01-01T00:00:00.000Z");
    const b = fixture("a", "2026-01-01T00:00:00.000Z");
    expect(compareCards(a, b)).toBe(0);
  });
});

describe("buildCardTree", () => {
  it("returns a single root for a linear chain", () => {
    const root = fixture("root", "2026-01-01T00:00:00.000Z");
    const child = fixture("child", "2026-01-02T00:00:00.000Z", [root]);
    const grandchild = fixture("grandchild", "2026-01-03T00:00:00.000Z", [child]);

    const tree = buildCardTree([root, child, grandchild]);
    expect(tree).toHaveLength(1);
    expect(tree[0].card.id).toBe("root");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].card.id).toBe("child");
    expect(tree[0].children[0].children[0].card.id).toBe("grandchild");
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children[0].depth).toBe(1);
    expect(tree[0].children[0].children[0].depth).toBe(2);
  });

  it("stacks siblings (same previous card) one below the other", () => {
    const root = fixture("root", "2026-01-01T00:00:00.000Z");
    const branchA = fixture("branchA", "2026-01-02T00:00:00.000Z", [root]);
    const branchB = fixture("branchB", "2026-01-03T00:00:00.000Z", [root]);

    const tree = buildCardTree([root, branchA, branchB]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children.map((c) => c.card.id)).toEqual(["branchA", "branchB"]);
  });

  it("nests a child of a sibling under that sibling", () => {
    const root = fixture("root", "2026-01-01T00:00:00.000Z");
    const branchA = fixture("branchA", "2026-01-02T00:00:00.000Z", [root]);
    const branchB = fixture("branchB", "2026-01-03T00:00:00.000Z", [root]);
    const underA = fixture("underA", "2026-01-04T00:00:00.000Z", [branchA]);

    const tree = buildCardTree([root, branchA, branchB, underA]);
    const aNode = tree[0].children.find((n) => n.card.id === "branchA");
    const bNode = tree[0].children.find((n) => n.card.id === "branchB");
    expect(aNode?.children[0]?.card.id).toBe("underA");
    expect(bNode?.children).toHaveLength(0);
  });

  it("places a card with multiple previous cards under its earliest-created parent once", () => {
    const rootA = fixture("rootA", "2026-01-01T00:00:00.000Z");
    const parentA = fixture("parentA", "2026-01-02T00:00:00.000Z", [rootA]);
    const parentB = fixture("parentB", "2026-01-03T00:00:00.000Z", [rootA]);
    const multiParent = fixture("multi", "2026-01-04T00:00:00.000Z", [parentA, parentB]);

    const tree = buildCardTree([rootA, parentA, parentB, multiParent]);
    const allNodes: string[] = [];
    const walk = (node: { card: Card; children: typeof tree }) => {
      allNodes.push(node.card.id);
      node.children.forEach(walk);
    };
    tree.forEach(walk);
    expect(allNodes.filter((id) => id === "multi")).toHaveLength(1);
  });

  it("treats a card whose previous card is absent as a root", () => {
    const orphan = fixture("orphan", "2026-01-02T00:00:00.000Z", [
      fixture("missing", "2026-01-01T00:00:00.000Z"),
    ]);
    const tree = buildCardTree([orphan]);
    expect(tree).toHaveLength(1);
    expect(tree[0].card.id).toBe("orphan");
  });

  it("returns no nodes for an empty list", () => {
    expect(buildCardTree([])).toEqual([]);
  });
});

describe("isCardLeaf", () => {
  it("returns true when a card has no resolved next cards", () => {
    const card = fixture("a", "2026-01-01T00:00:00.000Z");
    expect(isCardLeaf({ ...card, nextCards: [] })).toBe(true);
  });

  it("returns false when a card has resolved next cards", () => {
    const card = fixture("a", "2026-01-01T00:00:00.000Z");
    const nextCard = fixture("b", "2026-01-02T00:00:00.000Z");
    expect(isCardLeaf({ ...card, nextCards: [nextCard] })).toBe(false);
  });

  it("falls back to isEditable when resolved next cards are absent", () => {
    const leafCard = fixture("a", "2026-01-01T00:00:00.000Z");
    expect(isCardLeaf({ ...leafCard, isEditable: true, nextCards: undefined })).toBe(true);
    expect(isCardLeaf({ ...leafCard, isEditable: false, nextCards: undefined })).toBe(false);
  });
});

describe("flattenCardTree", () => {
  it("flattens depth-first preserving parent-before-child order", () => {
    const root = fixture("root", "2026-01-01T00:00:00.000Z");
    const child = fixture("child", "2026-01-02T00:00:00.000Z", [root]);
    const sibling = fixture("sibling", "2026-01-03T00:00:00.000Z", [root]);

    const rows = flattenCardTree(buildCardTree([root, child, sibling]));
    expect(rows.map((r) => r.card.id)).toEqual(["root", "child", "sibling"]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 1]);
  });
});

describe("getNewestLeafCard", () => {
  it("returns null for an empty list", () => {
    expect(getNewestLeafCard([])).toBeNull();
  });

  it("returns the only card in an empty-leaf-free stream", () => {
    const a = fixture("a", "2026-01-01T00:00:00.000Z");
    (a as { nextCards?: Card[] }).nextCards = [];
    (a as { isEditable?: boolean }).isEditable = true;
    expect(getNewestLeafCard([a])?.id).toBe("a");
  });

  it("prefers leaf cards over cards with outgoing links", () => {
    const nonLeaf = fixture("a", "2026-01-03T00:00:00.000Z");
    (nonLeaf as { nextCards?: Card[] }).nextCards = [fixture("b", "2026-01-04T00:00:00.000Z")];
    const leaf = fixture("b", "2026-01-02T00:00:00.000Z");
    (leaf as { nextCards?: Card[] }).nextCards = [];
    expect(getNewestLeafCard([nonLeaf, leaf])?.id).toBe("b");
  });

  it("picks the newest leaf by createdAt", () => {
    const older = fixture("a", "2026-01-01T00:00:00.000Z");
    (older as { nextCards?: Card[] }).nextCards = [];
    const newer = fixture("b", "2026-01-02T00:00:00.000Z");
    (newer as { nextCards?: Card[] }).nextCards = [];
    expect(getNewestLeafCard([older, newer])?.id).toBe("b");
  });

  it("falls back to isEditable when nextCards is absent", () => {
    const editable = { ...fixture("a", "2026-01-01T00:00:00.000Z"), isEditable: true } as Card;
    delete (editable as { nextCards?: Card[] }).nextCards;
    expect(getNewestLeafCard([editable])?.id).toBe("a");
  });

  it("falls back to the newest card when nothing is a leaf", () => {
    const a = fixture("a", "2026-01-01T00:00:00.000Z");
    (a as { nextCards?: Card[] }).nextCards = [fixture("b", "2026-01-02T00:00:00.000Z")];
    const b = fixture("b", "2026-01-02T00:00:00.000Z");
    (b as { nextCards?: Card[] }).nextCards = [fixture("a", "2026-01-01T00:00:00.000Z")];
    expect(getNewestLeafCard([a, b])?.id).toBe("b");
  });
});
