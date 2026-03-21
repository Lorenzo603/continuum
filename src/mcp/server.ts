import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { createCard, getLatestCard, updateCard } from "@/lib/cards";
import { createStream, getStreamByTitle } from "@/lib/streams";
import { getWorkspaceByName } from "@/lib/workspaces";
import { CARD_STATUSES, type CardStatus } from "@/types";

const statusValues = CARD_STATUSES.map((status) => status.value) as [CardStatus, ...CardStatus[]];

function asTextResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function asErrorResult(message: string, details?: unknown) {
  const payload = details ? { error: message, details } : { error: message };

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

const server = new McpServer(
  {
    name: "continuum-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      logging: {},
    },
  },
);

server.tool(
  "get_workspace_by_name",
  "Resolve workspace information by exact workspace name.",
  {
    name: z.string().min(1),
  },
  async ({ name }) => {
    try {
      const workspace = await getWorkspaceByName(name);
      if (!workspace) {
        return asErrorResult("Workspace not found", { name });
      }

      return asTextResult({
        ok: true,
        workspace,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resolve workspace";
      return asErrorResult(message);
    }
  },
);

server.tool(
  "get_stream_by_title",
  "Resolve stream information by exact stream title, optionally scoped by workspaceId.",
  {
    title: z.string().min(1),
    workspaceId: z.string().uuid().optional(),
  },
  async ({ title, workspaceId }) => {
    try {
      const stream = await getStreamByTitle(title, workspaceId);
      if (!stream) {
        return asErrorResult("Stream not found", { title, workspaceId: workspaceId ?? null });
      }

      return asTextResult({
        ok: true,
        stream,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resolve stream";
      return asErrorResult(message);
    }
  },
);

server.tool(
  "create_stream",
  "Create a stream in a workspace. Optionally set parentStreamId to create a substream.",
  {
    title: z.string().min(1).max(200),
    workspaceId: z.string().uuid(),
    parentStreamId: z.string().uuid().nullable().optional(),
  },
  async ({ title, workspaceId, parentStreamId }) => {
    try {
      const stream = await createStream({
        title,
        workspaceId,
        parentStreamId: parentStreamId ?? null,
      });

      return asTextResult({
        ok: true,
        stream,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create stream";
      return asErrorResult(message);
    }
  },
);

server.tool(
  "create_card",
  "Create a new card in a stream. This will automatically close the previous editable card version.",
  {
    streamId: z.string().uuid(),
    content: z.string().min(1),
    status: z.enum(statusValues).optional(),
    tags: z.array(z.string()).optional(),
    dueDate: z.string().datetime().optional(),
  },
  async ({ streamId, content, status, tags, dueDate }) => {
    try {
      const card = await createCard({
        streamId,
        content,
        metadata: status || tags || dueDate ? { status, tags, dueDate } : null,
      });

      return asTextResult({
        ok: true,
        card,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create card";
      return asErrorResult(message);
    }
  },
);

server.tool(
  "set_latest_card_status",
  "Change the status of the latest editable card in a stream.",
  {
    streamId: z.string().uuid(),
    status: z.enum(statusValues),
  },
  async ({ streamId, status }) => {
    try {
      const latestCard = await getLatestCard(streamId);

      if (!latestCard) {
        return asErrorResult("No card exists for the provided streamId");
      }

      const updatedCard = await updateCard(latestCard.id, {
        content: latestCard.content,
        metadata: {
          ...(latestCard.metadata ?? {}),
          status,
        },
      });

      return asTextResult({
        ok: true,
        streamId,
        previousStatus: latestCard.metadata?.status ?? null,
        updatedStatus: updatedCard.metadata?.status ?? null,
        card: updatedCard,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update latest card status";
      return asErrorResult(message);
    }
  },
);

async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

start().catch((error) => {
  console.error("Continuum MCP server failed to start:", error);
  process.exit(1);
});
