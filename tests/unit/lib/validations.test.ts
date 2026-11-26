/**
 * Unit tests for src/lib/validations.ts — every Zod schema.
 * Covers valid inputs, invalid inputs, and edge cases:
 * empty strings, missing fields, out-of-range values, malformed JSON/uuids.
 * No network, no database — pure schema assertions.
 */
import { describe, it, expect } from "vitest";
import {
  workspaceIdParamSchema,
  cardMetadataSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  createStreamSchema,
  updateStreamSchema,
  reorderStreamsSchema,
  reorderWorkspacesSchema,
  createCardSchema,
  updateCardSchema,
  updateSettingsSchema,
} from "@/lib/validations";

const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";
const VALID_UUID_2 = "123e4567-e89b-42d3-a456-426614174001";
const VALID_DATETIME = "2026-01-15T10:30:00.000Z";

describe("workspaceIdParamSchema", () => {
  it("accepts a valid uuid", () => {
    expect(workspaceIdParamSchema.safeParse(VALID_UUID).success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    expect(workspaceIdParamSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(workspaceIdParamSchema.safeParse("").success).toBe(false);
  });

  it("rejects null and numbers", () => {
    expect(workspaceIdParamSchema.safeParse(null).success).toBe(false);
    expect(workspaceIdParamSchema.safeParse(42).success).toBe(false);
  });
});

describe("cardMetadataSchema", () => {
  it("accepts a fully populated metadata object", () => {
    const result = cardMetadataSchema.safeParse({
      tags: ["a", "b"],
      dueDate: VALID_DATETIME,
      status: "in-progress",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a partially populated metadata object", () => {
    expect(cardMetadataSchema.safeParse({ tags: ["x"] }).success).toBe(true);
    expect(cardMetadataSchema.safeParse({ status: "backlog" }).success).toBe(true);
    expect(cardMetadataSchema.safeParse({ dueDate: VALID_DATETIME }).success).toBe(true);
  });

  it("accepts null and undefined (optional field)", () => {
    expect(cardMetadataSchema.safeParse(null).success).toBe(true);
    expect(cardMetadataSchema.safeParse(undefined).success).toBe(true);
  });

  it("rejects an invalid status value", () => {
    expect(cardMetadataSchema.safeParse({ status: "done" }).success).toBe(false);
  });

  it("rejects an invalid dueDate (not ISO datetime)", () => {
    expect(cardMetadataSchema.safeParse({ dueDate: "tomorrow" }).success).toBe(false);
    expect(cardMetadataSchema.safeParse({ dueDate: "2026-01-15" }).success).toBe(false);
  });

  it("rejects non-string tags", () => {
    expect(cardMetadataSchema.safeParse({ tags: [1, 2] }).success).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(cardMetadataSchema.safeParse("metadata").success).toBe(false);
    expect(cardMetadataSchema.safeParse(123).success).toBe(false);
  });
});

describe("createWorkspaceSchema", () => {
  it("accepts a minimal valid workspace", () => {
    const result = createWorkspaceSchema.safeParse({ name: "My Workspace" });
    expect(result.success).toBe(true);
  });

  it("accepts a name with a nullable description", () => {
    expect(createWorkspaceSchema.safeParse({ name: "W", description: null }).success).toBe(true);
    expect(createWorkspaceSchema.safeParse({ name: "W", description: "desc" }).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(createWorkspaceSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(createWorkspaceSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name longer than 100 characters", () => {
    expect(createWorkspaceSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
    expect(createWorkspaceSchema.safeParse({ name: "x".repeat(100) }).success).toBe(true);
  });

  it("rejects a description longer than 500 characters", () => {
    expect(
      createWorkspaceSchema.safeParse({ name: "W", description: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("rejects non-string name", () => {
    expect(createWorkspaceSchema.safeParse({ name: 123 }).success).toBe(false);
  });
});

describe("updateWorkspaceSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updateWorkspaceSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a partial update", () => {
    expect(updateWorkspaceSchema.safeParse({ name: "Renamed" }).success).toBe(true);
    expect(updateWorkspaceSchema.safeParse({ description: null }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(updateWorkspaceSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name over 100 characters", () => {
    expect(updateWorkspaceSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
  });
});

describe("createStreamSchema", () => {
  it("accepts a valid top-level stream", () => {
    const result = createStreamSchema.safeParse({ title: "Stream", workspaceId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("accepts a nested stream with parentStreamId and insertAtStart", () => {
    const result = createStreamSchema.safeParse({
      title: "Child",
      workspaceId: VALID_UUID,
      parentStreamId: VALID_UUID_2,
      insertAtStart: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts parentStreamId: null", () => {
    expect(
      createStreamSchema.safeParse({ title: "S", workspaceId: VALID_UUID, parentStreamId: null }).success,
    ).toBe(true);
  });

  it("rejects a missing title", () => {
    expect(createStreamSchema.safeParse({ workspaceId: VALID_UUID }).success).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(createStreamSchema.safeParse({ title: "", workspaceId: VALID_UUID }).success).toBe(false);
  });

  it("rejects a title longer than 200 characters", () => {
    expect(
      createStreamSchema.safeParse({ title: "x".repeat(201), workspaceId: VALID_UUID }).success,
    ).toBe(false);
  });

  it("rejects a non-uuid workspaceId", () => {
    expect(createStreamSchema.safeParse({ title: "S", workspaceId: "nope" }).success).toBe(false);
  });

  it("rejects a non-uuid parentStreamId", () => {
    expect(
      createStreamSchema.safeParse({ title: "S", workspaceId: VALID_UUID, parentStreamId: "nope" }).success,
    ).toBe(false);
  });

  it("rejects a non-boolean insertAtStart", () => {
    expect(
      createStreamSchema.safeParse({ title: "S", workspaceId: VALID_UUID, insertAtStart: "yes" }).success,
    ).toBe(false);
  });
});

describe("updateStreamSchema", () => {
  it("accepts an empty object", () => {
    expect(updateStreamSchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid partial updates", () => {
    expect(updateStreamSchema.safeParse({ title: "New" }).success).toBe(true);
    expect(updateStreamSchema.safeParse({ orderIndex: 0 }).success).toBe(true);
    expect(updateStreamSchema.safeParse({ status: "archived" }).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(updateStreamSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects a negative orderIndex", () => {
    expect(updateStreamSchema.safeParse({ orderIndex: -1 }).success).toBe(false);
  });

  it("rejects a non-integer orderIndex", () => {
    expect(updateStreamSchema.safeParse({ orderIndex: 1.5 }).success).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(updateStreamSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});

describe("reorderStreamsSchema / reorderWorkspacesSchema", () => {
  it("accepts a non-empty array of uuids", () => {
    expect(reorderStreamsSchema.safeParse({ orderedIds: [VALID_UUID, VALID_UUID_2] }).success).toBe(true);
    expect(reorderWorkspacesSchema.safeParse({ orderedIds: [VALID_UUID] }).success).toBe(true);
  });

  it("rejects an empty array", () => {
    expect(reorderStreamsSchema.safeParse({ orderedIds: [] }).success).toBe(false);
    expect(reorderWorkspacesSchema.safeParse({ orderedIds: [] }).success).toBe(false);
  });

  it("rejects non-uuid members", () => {
    expect(reorderStreamsSchema.safeParse({ orderedIds: ["nope"] }).success).toBe(false);
  });
});

describe("createCardSchema", () => {
  it("accepts a minimal valid card", () => {
    expect(createCardSchema.safeParse({ streamId: VALID_UUID, content: "hello" }).success).toBe(true);
  });

  it("accepts metadata", () => {
    expect(
      createCardSchema.safeParse({
        streamId: VALID_UUID,
        content: "hello",
        metadata: { status: "waiting", tags: ["t"] },
      }).success,
    ).toBe(true);
  });

  it("rejects missing content", () => {
    expect(createCardSchema.safeParse({ streamId: VALID_UUID }).success).toBe(false);
  });

  it("rejects empty content", () => {
    expect(createCardSchema.safeParse({ streamId: VALID_UUID, content: "" }).success).toBe(false);
  });

  it("rejects a non-uuid streamId", () => {
    expect(createCardSchema.safeParse({ streamId: "nope", content: "hi" }).success).toBe(false);
  });

  it("rejects malformed metadata", () => {
    expect(
      createCardSchema.safeParse({ streamId: VALID_UUID, content: "hi", metadata: { status: "bogus" } }).success,
    ).toBe(false);
  });
});

describe("updateCardSchema", () => {
  it("accepts a valid update", () => {
    expect(updateCardSchema.safeParse({ content: "updated" }).success).toBe(true);
  });

  it("rejects an empty content string", () => {
    expect(updateCardSchema.safeParse({ content: "" }).success).toBe(false);
  });

  it("rejects missing content", () => {
    expect(updateCardSchema.safeParse({}).success).toBe(false);
  });
});

describe("updateSettingsSchema", () => {
  it("accepts a boolean", () => {
    expect(updateSettingsSchema.safeParse({ prepopulateCardContent: true }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ prepopulateCardContent: false }).success).toBe(true);
  });

  it("rejects missing or non-boolean values", () => {
    expect(updateSettingsSchema.safeParse({}).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ prepopulateCardContent: "yes" }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ prepopulateCardContent: 1 }).success).toBe(false);
  });
});
