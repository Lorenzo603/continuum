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
| `npm test` | Unit tests (no DB, no network) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:integration` | DB-backed integration tests (uses `.env` `DATABASE_URL`) |
| `npm run test:all` | Unit + integration |
| `npm run test:ui` | Playwright browser smoke suite (needs Clerk test account env vars) |

## Testing

Vitest-based suite; see `tests/README.md` for details and DB-safety guarantees.
- `tests/unit/**` — pure logic (validations, lib failure paths, Zustand stores with mocked fetch). No DB/network.
- `tests/integration/**` — real Drizzle + Postgres via `.env` `DATABASE_URL`. Each test creates a dedicated `test-integration-*` workspace for an `it-user-*` user and deletes it in `afterEach` (cascade verifies child cleanup). Never touches existing data.
- Configs: `vitest.config.ts` (unit), `vitest.integration.config.ts` (integration; loads `.env`).
- `tests/ui/**` — optional Playwright smoke suite against the app in normal Clerk mode (see `tests/README.md`). Requires `PLAYWRIGHT_CLERK_EMAIL` / `PLAYWRIGHT_CLERK_PASSWORD` and a dedicated Clerk Dev test user; browsers via `npx playwright install chromium`.

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
- **Stream** → contains many **Cards** organized as a DAG via the **`card_links`** join table
- **card_links** (`sourceCardId` → `targetCardId`) is the single source of truth for "next"/"previous". There is no `version` column and no separate "previous" column — "B is previous-of A" is derived from the reverse join (`targetCardId = A`). Links connect cards within the SAME stream only; self-links, cross-stream links, duplicates and cycles are rejected server-side (cycles are detected by DFS from the target along outgoing edges).
- A card is a **leaf** iff it has zero outgoing links. `isEditable` is the cached leaf flag (kept in sync by card creation/deletion and link add/remove). A stream has exactly ONE root card (the first card ever created) — every other card is created from an existing card via a `sourceCardId` link.
- A "branch here" affordance creates a new next-card from ANY card (not just leaves).
- Only leaf (editable) cards can be edited or deleted; deleting a leaf card cascades its links and re-marks any card whose outgoing links were entirely to the deleted card as editable again.
- Cards have `metadata` (JSON): `status`, `tags`, `dueDate`
- Card statuses: `in-progress`, `action-required`, `to-update`, `waiting`, `monitor`, `completed`, `backlog`

### Database

- PostgreSQL: schema at `src/db/schema.ts`.
- Drizzle config at `drizzle.config.ts` always uses the PostgreSQL dialect.
- `src/db/index.ts` exports a single PostgreSQL-backed `db`, `workspaces`, `streams`, `cards` — typed as `any`.
- IDs are UUIDs (generated with `uuid` v4).
- Migrations in `drizzle/pg/` (hand-written-style SQL with journal entries; `drizzle-kit generate` does not work against the current `drizzle/pg/meta` baseline).

### API Routes

- RESTful JSON API under `src/app/api/`.
- All input validated with Zod schemas from `src/lib/validations.ts`.
- Lookup/resolve endpoints: `GET /api/workspaces/resolve?name=...` and `GET /api/streams/resolve?title=...&workspaceId=...`.
- **Card creation** `POST /api/cards` accepts `{ streamId, content, metadata?, sourceCardId? }` — `sourceCardId` is REQUIRED unless the stream is empty (the root-card exception). The source card loses leaf status and is marked completed; the new card is a leaf (isEditable: true).
- **Link endpoints**: `POST /api/cards/:id/next` (body `{ targetCardId }`; returns the updated source card, 201) and `DELETE /api/cards/:id/next/:targetId` (removes the link, re-marking the source editable if it has no outgoing links; returns the updated source card). Both return the card with resolved `previousCards`/`nextCards` arrays ordered by createdAt then id.
- Card GET/PATCH responses include resolved `previousCards`/`nextCards` arrays (ordered by createdAt, then id).
- Error contract: 400 validation (self/cross-stream/cycle/duplicate/missing source/not leaf), 404 missing/unowned card or stream, 401 unauthorized, 500 unexpected (no stack traces).
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

- Supported dev environments: **Git Bash on Windows** and **zsh on macOS**.
- Use POSIX-style paths and POSIX shell commands in the terminal (e.g. `/c/p/continuum/...` in Git Bash; the native path in zsh).
- Workspace root: `C:/p/continuum` on Windows; the equivalent local path on macOS.
