// Core domain types for Continuum

export interface Stream {
  id: string;
  title: string;
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

export interface CardMetadata {
  tags?: string[];
  dueDate?: string;
  status?: "active" | "completed" | "archived";
}

// A stream with its resolved children for tree rendering
export interface StreamNode extends Stream {
  children: StreamNode[];
  depth: number;
}

// API request/response types
export interface CreateStreamInput {
  title: string;
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
