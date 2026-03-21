# Continuum

A timeline-based workstream evolution system built with Next.js. Organize personal and professional workflows using a stream-and-card paradigm where each update creates an immutable card, preserving your complete history.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Database**: SQLite (via better-sqlite3) — Postgres-ready via Drizzle
- **ORM**: Drizzle ORM
- **State**: Zustand
- **Validation**: Zod

## Getting Started

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Seed with sample data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Access Token Protection

The app includes a `proxy` middleware that can protect all routes (including API routes) using a shared token.

Set an environment variable:

```bash
ACCESS_TOKEN=your-secret-token
```

When `ACCESS_TOKEN` is set, each request must provide one of:

- `Authorization: Bearer <token>`
- `X-Access-Token: <token>`

If the token is missing or invalid, the app returns `401 Unauthorized`.
If `ACCESS_TOKEN` is not set, auth checks are skipped (development mode).

## MCP Server (for VS Code Agents)

This repo includes a local MCP server that exposes Continuum operations over stdio.

### Available tools

- `get_workspace_by_name`: Resolve a workspace (including `id`) from its name.
- `get_stream_by_title`: Resolve a stream (including `id`) from its title, optionally scoped by `workspaceId`.
- `create_stream`: Create a stream (or substream) in a workspace.
- `create_card`: Create a new card on a stream.
- `set_latest_card_status`: Update the status of the latest editable card in a stream.

### API resolve endpoints

- `GET /api/workspaces/resolve?name=<workspaceName>`: resolve workspace by exact name.
- `GET /api/streams/resolve?title=<streamTitle>&workspaceId=<optionalWorkspaceId>`: resolve stream by exact title.

### Run locally

```bash
npm run mcp:server
```

### VS Code configuration

An MCP config file is provided at `.vscode/mcp.json`:

```json
{
	"servers": {
		"continuum": {
			"type": "stdio",
			"command": "npm",
			"args": ["run", "mcp:server"]
		}
	}
}
```

If your VS Code setup does not auto-detect `.vscode/mcp.json`, copy the same block into your user/workspace MCP settings.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── streams/     # Stream CRUD endpoints
│   │   └── cards/       # Card CRUD endpoints
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Main page
│   ├── error.tsx        # Error boundary
│   └── loading.tsx      # Loading state
├── components/          # React components
│   ├── StreamBoard.tsx  # Main board container
│   ├── StreamRow.tsx    # Individual stream row
│   ├── CardItem.tsx     # Card display
│   ├── CardEditor.tsx   # Card create/edit form
│   ├── NewStreamForm.tsx
│   └── EmptyState.tsx
├── db/                  # Database layer
│   ├── schema.ts        # Drizzle schema definitions
│   ├── index.ts         # DB client
│   └── seed.ts          # Seed script
├── hooks/               # Custom React hooks
├── lib/                 # Data access & validation
│   ├── streams.ts       # Stream operations
│   ├── cards.ts         # Card operations (transactional)
│   └── validations.ts   # Zod schemas
├── stores/              # Zustand state stores
│   ├── streamStore.ts
│   ├── cardStore.ts
│   └── uiStore.ts
└── types/               # TypeScript type definitions
```

## Core Concepts

- **Streams** are horizontal timelines (rows) representing projects, goals, or themes
- **Cards** are immutable snapshots — editing always creates a new version
- **Substreams** nest under parent streams with visual indentation
- Cards grow left → right chronologically within each stream
