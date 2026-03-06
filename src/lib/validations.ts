import { z } from "zod";

export const cardMetadataSchema = z
  .object({
    tags: z.array(z.string()).optional(),
    dueDate: z.string().datetime().optional(),
    status: z.enum(["completed", "waiting", "in-progress", "action-required", "monitor", "to-update", "backlog"]).optional(),
  })
  .nullable()
  .optional();

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).nullable().optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export const createStreamSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  workspaceId: z.string().uuid(),
  parentStreamId: z.string().uuid().nullable().optional(),
});

export const updateStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const reorderStreamsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const createCardSchema = z.object({
  streamId: z.string().uuid(),
  content: z.string().min(1, "Content is required"),
  metadata: cardMetadataSchema,
});

export const updateCardSchema = z.object({
  content: z.string().min(1, "Content is required"),
  metadata: cardMetadataSchema,
});
