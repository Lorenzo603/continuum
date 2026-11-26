# Continuum — Test Suite

Three tiers. Unit tests never touch the network or the database. Integration
tests run against the real local Postgres database from `.env` — with strict
fixture isolation (see **DB safety guarantees**). Browser (UI) tests are
intentionally not installed yet; see the proposal below.

## Commands

| Command | What it runs | Needs DB? |
|---|---|---|
| `npm test` | Unit tests (`tests/unit/**`) | No |
| `npm run test:watch` | Unit tests in watch mode | No |
| `npm run test:integration` | DB-backed integration tests (`tests/integration/**`) | Yes — needs `DATABASE_URL` in `.env` |
| `npm run test:all` | Unit + integration | Yes (integration tier) |

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
└── integration/               # Real Drizzle + Postgres (see safety notes)
    ├── workspaces.test.ts
    ├── streams.test.ts
    ├── cards.test.ts
    ├── settings.test.ts
    └── helpers/fixtures.ts
```

Config files: `vitest.config.ts` (unit) and `vitest.integration.config.ts`
(integration; loads `.env` via `dotenv/config`). Both resolve the `@/*` path
alias.

## Required environment

- `.env` with `DATABASE_URL` (required only for `test:integration`).
  Unit tests do not read it — `npm test` must never fail because the DB is down.

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

## UI tests (not installed yet)

Optional browser-level tier. Options for a Next.js 16 App Router project:

1. **Playwright** (recommended) — first-class Next.js support, Chromium/Firefox/WebKit,
   `next dev`/`next start` auto-start via config, trace viewer, CI-friendly.
   Would add `@playwright/test`, `playwright.config.ts`, and a small smoke suite
   (sign-in/redirect, workspace sidebar, stream board, card create/edit).
   Auth must be handled explicitly: either legacy-token mode
   (`NEXT_PUBLIC_ENABLE_CLERK_AUTH=false` + `ACCESS_TOKEN`) at build/dev time,
   or Clerk test accounts — decision required from the user.
2. **Cypress** — mature and easy DOM inspection, but less streamlined for App Router.
3. **Testing Library + jsdom/happy-dom via Vitest** — component-level coverage;
   complementary, not a real browser.
4. **Storybook + browser tests** — heavy; only if the project adopts Storybook.

Waiting on the user's choice before installing anything.
