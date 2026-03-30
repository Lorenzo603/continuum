# CLAUDE.md — Continuum

## Project Overview

Continuum is a **timeline-based workstream organizer** — a Next.js web app for organizing personal and professional workflows using **workspaces**, **streams** (hierarchical), and **immutable card history**. Cards track versioned content with metadata (status, tags, due dates).

## Tech Stack

- **Framework:** Next.js 16 (App Router, standalone output)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4, PostCSS
- **State:** Zustand (client stores), React Server Components (server state)
- **Database:** Drizzle ORM with dual-dialect support — SQLite (better-sqlite3, default for dev) and PostgreSQL (node-postgres, default for Docker/prod)
- **Validation:** Zod
- **Drag & Drop:** @dnd-kit
- **Fonts:** Outfit, DM Sans (next/font/google)
- **Toasts:** Sonner
- **MCP:** Model Context Protocol server via `@modelcontextprotocol/sdk`

## Quick Start

```bash
npm install
npm run dev          # starts on port 4000
```

Default dev uses SQLite (`./continuum.db`). No extra setup needed.

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
| `DB_TYPE` | `"sqlite"` or `"postgres"` | `"sqlite"` |
| `SQLITE_PATH` | Path to SQLite file | `"./continuum.db"` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `ACCESS_TOKEN` | Optional API auth token | — |
| `ACCESS_TOKEN_CHECK_DISABLED` | Set `"true"` to skip auth | — |
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
│   ├── config.ts           # DB_TYPE, connection string resolution
│   ├── index.ts            # Drizzle instance factory (sqlite or postgres)
│   ├── schema.pg.ts        # PostgreSQL schema
│   ├── schema.sqlite.ts    # SQLite schema
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
└── proxy.ts                # Access token middleware logic
```

## Architecture & Conventions

### Domain Model

- **Workspace** → contains many **Streams** (hierarchical, with `parentStreamId`)
- **Stream** → contains many **Cards** (versioned, append-only by design)
- Cards have `metadata` (JSON): `status`, `tags`, `dueDate`
- Card statuses: `in-progress`, `action-required`, `to-update`, `waiting`, `monitor`, `completed`, `backlog`

### Database

- Dual-dialect: schemas at `src/db/schema.pg.ts` and `src/db/schema.sqlite.ts` — keep both in sync when modifying the schema.
- Drizzle config at `drizzle.config.ts` dynamically selects dialect based on `DB_TYPE`.
- `src/db/index.ts` exports a unified `db`, `workspaces`, `streams`, `cards` — typed as `any` to support both dialects.
- IDs are UUIDs (generated with `uuid` v4).
- Migrations in `drizzle/pg/` (PostgreSQL only currently).

### API Routes

- RESTful JSON API under `src/app/api/`.
- All input validated with Zod schemas from `src/lib/validations.ts`.
- Lookup/resolve endpoints: `GET /api/workspaces/resolve?name=...` and `GET /api/streams/resolve?title=...&workspaceId=...`.
- Optional access token auth via `ACCESS_TOKEN` env var (checked in `src/proxy.ts`).

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
- Uses `CONTINUUM_API_BASE_URL` and `ACCESS_TOKEN` env vars to call the app's REST API.

### Docker

- Multi-stage Dockerfile: `deps` → `build` → `production`.
- Production image uses PostgreSQL (`DB_TYPE=postgres`).
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
