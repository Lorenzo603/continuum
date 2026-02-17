import { z } from "zod";

export const cardMetadataSchema = z
  .object({
    tags: z.array(z.string()).optional(),
    dueDate: z.string().datetime().optional(),
    status: z.enum(["completed", "waiting", "in-progress", "action-required", "monitor"]).optional(),
  })
  .nullable()
  .optional();

export const createStreamSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  parentStreamId: z.string().uuid().nullable().optional(),
});

export const updateStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  orderIndex: z.number().int().min(0).optional(),
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
