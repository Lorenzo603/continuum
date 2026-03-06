// Core domain types for Continuum

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Stream {
  id: string;
  title: string;
  workspaceId: string;
  parentStreamId: string | null;
  orderIndex: number;
  createdAt: string;
}

export interface Card {
  id: string;
  streamId: string;
  content: string;
  version: number;
  isEditable: boolean;
  metadata: CardMetadata | null;
  createdAt: string;
}

export type CardStatus = "completed" | "waiting" | "in-progress" | "action-required" | "monitor" | "to-update" | "backlog";

export const CARD_STATUSES: { value: CardStatus; label: string }[] = [
  { value: "in-progress", label: "In Progress" },
  { value: "action-required", label: "Action Required" },
  { value: "to-update", label: "To Update" },
  { value: "waiting", label: "Waiting" },
  { value: "monitor", label: "Monitor" },
  { value: "completed", label: "Completed" },
  { value: "backlog", label: "Backlog" },
];

export interface CardMetadata {
  tags?: string[];
  dueDate?: string;
  status?: CardStatus;
}

// A stream with its resolved children for tree rendering
export interface StreamNode extends Stream {
  children: StreamNode[];
  depth: number;
}

// API request/response types
export interface CreateWorkspaceInput {
  name: string;
  description?: string | null;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string | null;
}

export interface CreateStreamInput {
  title: string;
  workspaceId: string;
  parentStreamId?: string | null;
}

export interface UpdateStreamInput {
  title?: string;
  orderIndex?: number;
}

export interface CreateCardInput {
  streamId: string;
  content: string;
  metadata?: CardMetadata | null;
}

export interface UpdateCardInput {
  content: string;
  metadata?: CardMetadata | null;
}
