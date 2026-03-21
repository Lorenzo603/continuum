import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { CARD_STATUSES, type CardStatus } from "@/types";

const statusValues = CARD_STATUSES.map((status) => status.value) as [CardStatus, ...CardStatus[]];
const apiBaseUrl = process.env.CONTINUUM_API_BASE_URL ?? "http://localhost:3000";
const accessToken = process.env.ACCESS_TOKEN || "";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  query?: Record<string, string | undefined>;
  body?: unknown;
};

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; details?: unknown };

type CardRecord = {
  id: string;
  content: string;
  version: number;
  isEditable: boolean;
  metadata?: {
    status?: CardStatus;
    tags?: string[];
    dueDate?: string;
  } | null;
};

function buildApiUrl(pathname: string, query?: Record<string, string | undefined>) {
  const url = new URL(pathname, apiBaseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url;
}

function parseErrorPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { message: "Request failed", details: null };
  }

  const message = "error" in payload && typeof payload.error === "string"
    ? payload.error
    : "Request failed";

  const details = "details" in payload ? payload.details : null;

  return { message, details };
}

async function apiRequest<T>(pathname: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(buildApiUrl(pathname, options.query), {
      method: options.method ?? "GET",
      headers: {
        "X-Access-Token": accessToken,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const { message, details } = parseErrorPayload(payload);
      return {
        ok: false,
        status: response.status,
        message,
        details,
      };
    }

    return {
      ok: true,
      data: payload as T,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return {
      ok: false,
      status: 0,
      message,
    };
  }
}

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
    const response = await apiRequest<unknown>("/api/workspaces/resolve", {
      query: { name },
    });

    if (!response.ok) {
      return asErrorResult(response.message, {
        name,
        status: response.status,
        details: response.details ?? null,
      });
    }

    return asTextResult({
      ok: true,
      workspace: response.data,
    });
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
    const response = await apiRequest<unknown>("/api/streams/resolve", {
      query: {
        title,
        workspaceId,
      },
    });

    if (!response.ok) {
      return asErrorResult(response.message, {
        title,
        workspaceId: workspaceId ?? null,
        status: response.status,
        details: response.details ?? null,
      });
    }

    return asTextResult({
      ok: true,
      stream: response.data,
    });
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
    const response = await apiRequest<unknown>("/api/streams", {
      method: "POST",
      body: {
        title,
        workspaceId,
        parentStreamId: parentStreamId ?? null,
      },
    });

    if (!response.ok) {
      return asErrorResult(response.message, {
        title,
        workspaceId,
        parentStreamId: parentStreamId ?? null,
        status: response.status,
        details: response.details ?? null,
      });
    }

    return asTextResult({
      ok: true,
      stream: response.data,
    });
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
    const response = await apiRequest<unknown>("/api/cards", {
      method: "POST",
      body: {
        streamId,
        content,
        metadata: status || tags || dueDate ? { status, tags, dueDate } : null,
      },
    });

    if (!response.ok) {
      return asErrorResult(response.message, {
        streamId,
        status: response.status,
        details: response.details ?? null,
      });
    }

    return asTextResult({
      ok: true,
      card: response.data,
    });
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
    const cardsResponse = await apiRequest<CardRecord[]>(`/api/streams/${streamId}/cards`);

    if (!cardsResponse.ok) {
      return asErrorResult(cardsResponse.message, {
        streamId,
        status: cardsResponse.status,
        details: cardsResponse.details ?? null,
      });
    }

    const latestCard = cardsResponse.data
      .filter((card) => card.isEditable)
      .sort((a, b) => b.version - a.version)[0];

    if (!latestCard) {
      return asErrorResult("No editable card exists for the provided streamId", {
        streamId,
      });
    }

    const updateResponse = await apiRequest<CardRecord>(`/api/cards/${latestCard.id}`, {
      method: "PATCH",
      body: {
        content: latestCard.content,
        metadata: {
          ...(latestCard.metadata ?? {}),
          status,
        },
      },
    });

    if (!updateResponse.ok) {
      return asErrorResult(updateResponse.message, {
        streamId,
        cardId: latestCard.id,
        status: updateResponse.status,
        details: updateResponse.details ?? null,
      });
    }

    return asTextResult({
      ok: true,
      streamId,
      previousStatus: latestCard.metadata?.status ?? null,
      updatedStatus: updateResponse.data.metadata?.status ?? null,
      card: updateResponse.data,
    });
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
