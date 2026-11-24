# CLAUDE.md — Continuum

## Project Overview

Continuum is a **timeline-based workstream organizer** — a Next.js web app for organizing personal and professional workflows using **workspaces**, **streams** (hierarchical), and **immutable card history**. Cards track versioned content with metadata (status, tags, due dates).

## Tech Stack

- **Framework:** Next.js 16 (App Router, standalone output)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4, PostCSS
- **State:** Zustand (client stores), React Server Components (server state)
- **Database:** PostgreSQL (node-postgres) via Drizzle ORM
- **Validation:** Zod
- **Drag & Drop:** @dnd-kit
- **Fonts:** Outfit, DM Sans (next/font/google)
- **Toasts:** Sonner
- **Authentication:** Clerk
- **MCP:** Model Context Protocol server via `@modelcontextprotocol/sdk`

## Quick Start

```bash
npm install
npm run dev          # starts on port 4000
```

Default dev requires a PostgreSQL database; set `DATABASE_URL` in `.env` (see `.env.example`).

## Key Commands

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 4000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run db:push` | Push schema changes via Drizzle Kit |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run mcp:server` | Run the MCP stdio server |

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) | — |
| `NEXT_PUBLIC_ENABLE_CLERK_AUTH` | Build-time auth mode switch (`"true"` Clerk, `"false"` legacy token mode) | `"true"` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (client) | — |
| `CLERK_SECRET_KEY` | Clerk secret key (server) | — |
| `ACCESS_TOKEN` | Shared token for legacy auth mode (`NEXT_PUBLIC_ENABLE_CLERK_AUTH=false`) | — |
| `ACCESS_TOKEN_CHECK_DISABLED` | Skip legacy token checks when set `"true"` | `"false"` |
| `LEGACY_AUTH_USER_ID` | Tenant user id used in legacy token mode | `"legacy-user"` |
| `CLERK_MCP_BEARER_TOKEN` | Pre-minted Clerk bearer token for MCP | — |
| `CLERK_M2M_TOKEN_URL` | OAuth token endpoint for client-credentials flow | — |
| `CLERK_M2M_CLIENT_ID` | Machine-to-machine client id for MCP | — |
| `CLERK_M2M_CLIENT_SECRET` | Machine-to-machine client secret for MCP | — |
| `CLERK_M2M_AUDIENCE` | Optional OAuth audience for MCP token requests | — |
| `CLERK_M2M_SCOPE` | Optional OAuth scope for MCP token requests | — |
| `CONTINUUM_API_BASE_URL` | Base URL for MCP server API calls | `"http://localhost:3000"` |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Main page (WorkspaceSidebar + StreamBoard)
│   ├── layout.tsx          # Root layout (fonts, theme script, Toaster)
│   └── api/                # REST API route handlers
│       ├── workspaces/     # CRUD + resolve by name + export
│       ├── streams/        # CRUD + reorder + resolve by title
│       └── cards/          # CRUD
├── components/             # React components (mix of client and server)
├── db/
│   ├── config.ts           # DATABASE_URL resolution
│   ├── index.ts            # PostgreSQL Drizzle instance
│   ├── schema.ts           # PostgreSQL schema
│   └── seed.ts             # Database seeder
├── hooks/                  # Custom React hooks (useCards, useStreams, etc.)
├── lib/                    # Server-side business logic
│   ├── workspaces.ts       # Workspace queries/mutations
│   ├── streams.ts          # Stream queries/mutations (tree building)
│   ├── cards.ts            # Card queries/mutations
│   ├── validations.ts      # Zod schemas for all inputs
│   └── exportWorkspace.ts  # Workspace export logic
├── mcp/
│   └── server.ts           # MCP stdio server (tools for AI agents)
├── stores/                 # Zustand client stores
│   ├── workspaceStore.ts
│   ├── streamStore.ts
│   ├── cardStore.ts
│   ├── uiStore.ts
│   └── themeStore.ts
├── types/
│   └── index.ts            # Core domain types (Workspace, Stream, Card, etc.)
└── proxy.ts                # Clerk auth middleware
```

## Architecture & Conventions

### Domain Model

- **Workspace** → contains many **Streams** (hierarchical, with `parentStreamId`)
- **Stream** → contains many **Cards** (versioned, append-only by design)
- Cards have `metadata` (JSON): `status`, `tags`, `dueDate`
- Card statuses: `in-progress`, `action-required`, `to-update`, `waiting`, `monitor`, `completed`, `backlog`

### Database

- PostgreSQL: schema at `src/db/schema.ts`.
- Drizzle config at `drizzle.config.ts` always uses the PostgreSQL dialect.
- `src/db/index.ts` exports a single PostgreSQL-backed `db`, `workspaces`, `streams`, `cards` — typed as `any`.
- IDs are UUIDs (generated with `uuid` v4).
- Migrations in `drizzle/pg/`.

### API Routes

- RESTful JSON API under `src/app/api/`.
- All input validated with Zod schemas from `src/lib/validations.ts`.
- Lookup/resolve endpoints: `GET /api/workspaces/resolve?name=...` and `GET /api/streams/resolve?title=...&workspaceId=...`.
- Clerk middleware protects all app/API routes (excluding static assets and auth routes).
- Workspace/stream/card API handlers enforce per-user ownership via Clerk `userId` filtering.

### Client State

- Zustand stores in `src/stores/` — each store fetches from API routes and manages optimistic updates.
- Active workspace ID persisted in `localStorage` under `continuum:activeWorkspaceId`.
- Theme persisted in `localStorage` under `continuum:theme`.

### Components

- Server Components by default; Client Components marked with `'use client'`.
- Main page: `WorkspaceSidebar` (left panel) + `StreamBoard` (main content).
- Card editing via `CardEditor` / `CardEditorModal`.
- Drag-and-drop stream reordering via `@dnd-kit`.

### MCP Server

- Stdio-based MCP server at `src/mcp/server.ts`, run via `npm run mcp:server`.
- Exposes tools for AI agents: lookup workspaces/streams by name, create/update cards and streams.
- Configured in VS Code via `.vscode/mcp.json` (uses top-level `servers` key, not `mcpServers`).
- Uses `CONTINUUM_API_BASE_URL` plus Clerk machine auth env vars to call protected REST APIs.

### Docker

- Multi-stage Dockerfile: `deps` → `build` → `production`.
- Production image uses PostgreSQL.
- Runs as non-root `appuser`, exposes port 3000.
- Uses Next.js standalone output mode.

## Coding Standards

- TypeScript strict mode. Use explicit types; avoid `any` except in the db abstraction layer.
- Zod for all API input validation (`src/lib/validations.ts`).
- Path alias: `@/*` maps to `./src/*`.
- ESLint config: `eslint-config-next` (core-web-vitals + typescript).
- Tailwind v4 via `@tailwindcss/postcss`.
- No test framework currently configured.

## Development Environment

- The VS Code terminal runs **bash (WSL)**, not cmd or PowerShell.
- Always use Linux paths (`/mnt/c/p/continuum/...`) and Linux commands when running in the terminal.
- The workspace root on WSL is `/mnt/c/p/continuum`.
