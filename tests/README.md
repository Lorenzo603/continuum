# Continuum — Test Suite

Three tiers. Unit tests never touch the network or the database. Integration
tests run against the real local Postgres database from `.env` — with strict
fixture isolation (see **DB safety guarantees**). Browser (UI) tests use
Playwright against the app in its normal Clerk mode; see **UI tests** below.

## Commands

| Command | What it runs | Needs DB? |
|---|---|---|
| `npm test` | Unit tests (`tests/unit/**`) | No |
| `npm run test:watch` | Unit tests in watch mode | No |
| `npm run test:integration` | DB-backed integration tests (`tests/integration/**`) | Yes — needs `DATABASE_URL` in `.env` |
| `npm run test:all` | Unit + integration | Yes (integration tier) |
| `npm run test:ui` | Playwright smoke suite (Chromium) | Yes — Clerk test account env vars |

## Layout

```
tests/
├── unit/                      # Pure logic; fetch/DB/Clerk all mocked
│   ├── lib/
│   │   ├── validations.test.ts   # Every Zod schema in src/lib/validations.ts
│   │   └── exportWorkspace.test.ts
│   └── stores/
│       ├── workspaceStore.test.ts   # Optimistic updates + rollback
│       ├── streamStore.test.ts      # Tree helpers via store actions
│       ├── cardStore.test.ts        # Optimistic card mutations
│       ├── uiStore.test.ts          # Set-based UI state
│       └── themeStore.test.ts       # Theme toggle + persistence
├── integration/               # Real Drizzle + Postgres (see safety notes)
│   ├── workspaces.test.ts
│   ├── streams.test.ts
│   ├── cards.test.ts
│   ├── settings.test.ts
│   └── helpers/fixtures.ts
└── ui/                        # Playwright smoke suite (optional, see below)
    └── smoke.spec.ts
```

Config files: `vitest.config.ts` (unit), `vitest.integration.config.ts`
(integration; loads `.env` via `dotenv/config`), and `playwright.config.ts`
(UI). The Vitest configs resolve the `@/*` path alias.

## Required environment

- `.env` with `DATABASE_URL` (required only for `test:integration`).
  Unit tests do not read it — `npm test` must never fail because the DB is down.
- For `test:ui` — a dedicated Clerk test user (see **UI tests**).

## DB safety guarantees (integration tier)

- Each test creates its own workspace named `test-integration-<timestamp>-<rand>`
  for a dedicated `it-user-<timestamp>-<rand>` user. No pre-existing data is
  read or written.
- `afterEach` deletes the fixture workspace. Schema cascade
  (`workspaces → streams → cards`) removes children. The cleanup helper
  verifies the workspace still carries the `it-user-` prefix before deleting
  and throws loudly otherwise — it never deletes unknown data.
- `settings` cleanup deletes only rows for the fixture's dedicated user.
- Fixtures are isolated per test, so files can run in parallel.

## UI tests (Playwright)

Browser-level smoke suite in `tests/ui/smoke.spec.ts` (Chromium; traces on
failure). Runs the app exactly as it runs locally: Clerk auth mode
(`NEXT_PUBLIC_ENABLE_CLERK_AUTH=true`) against the local dev server on port 4000,
which Playwright starts automatically (`webServer` in `playwright.config.ts`).

**Setup — one-time, by a human:** create a dedicated test user in the Clerk Dev
instance (Dashboard → Users → Add test user, email + password). Then export the
credentials in your shell (or a gitignored `.env.local`) — they are never
committed:

```bash
export PLAYWRIGHT_CLERK_EMAIL="ui-test@example.com"
export PLAYWRIGHT_CLERK_PASSWORD="..."
```

`PLAYWRIGHT_BASE_URL` overrides the default `http://localhost:4000`.

The suite covers: unauthenticated redirect to Clerk sign-in, sign-in with the
Clerk test account, workspace sidebar rendering, and workspace creation via the
sidebar. The created workspace is deleted through the app's own API (same
authenticated session) so no test data is left behind.

> Note: the Clerk dev instance redirects unauthenticated users to its hosted
> sign-in page (`<instance>.accounts.dev/sign-in`), not the local embedded
> `/sign-in` page — the suite follows the real flow, including that redirect.

Install browsers once with `npx playwright install chromium`.
