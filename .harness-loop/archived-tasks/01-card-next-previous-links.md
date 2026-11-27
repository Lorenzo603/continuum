---
status: done
attempts: 2
title: "Many-to-many next/previous links between cards"
source: backlog.md
depends_on: nothing
---

## Task

You are implementing a many-to-many "next"/"previous" link model between cards
in the Continuum workstream organizer (Next.js App Router + TypeScript strict mode + PostgreSQL via Drizzle ORM + Zod + Zustand). Read AGENTS.md first and follow it; nothing here overrides it.

GOAL
----
Today, sequential version order within a stream implicitly encodes "next", and cards carry a `version` column. Remove that model and replace it with an explicit many-to-many "next"/"previous" relation between cards:

- A card may have MULTIPLE "next" cards (outgoing links).
- A card may have MULTIPLE "previous" cards (incoming links).
- Links connect cards within the SAME stream only.
- The join table is the SINGLE source of truth for "next"/"previous" — the `version` column is dropped entirely.
- Links are implicit and NOT visible in the UI (no graph view, no arrows, no link badges).
- Cards that share the same "previous" card are displayed one below the other vertically in the board.
- A stream has exactly ONE root card (the first card ever created). New cards are ALWAYS created from an existing card, except for that root.
- A "branch here" affordance allows the user to create a next card starting from ANY card of the sequence.

INVARIANTS
----------
- "A is next-of B" ⟺ "B is previous-of A" — derived by the reverse join. There is no separate "previous" column.
- No duplicate links: UNIQUE(sourceCardId, targetCardId).
- No self-links: source != target.
- No cycles, enforced at the backend (no UI cycle detection): a new link (source=S, target=T) is rejected if T can reach S through existing outgoing links (DFS/BFS from T along outgoing edges; reject if it reaches S — this also covers S == T). Surface as 400/409 with a message like "Cannot connect: target card is one of source card's previous cards".
- DELETION is allowed only for "leaf" cards — cards with zero outgoing "next" links. A stream may have MORE THAN ONE leaf. Deleting a leaf card deletes all its links (incoming and outgoing) via cascade. A card becomes editable again (isEditable: true) iff, after the deletion, it has no outgoing links.

CURRENT STATE (inspect before implementing)
-------------------------------------------
- `src/db/schema.ts`: `cards` has `version` (integer notNull default 1) and uniqueIndex `stream_version_idx` (streamId, version).
- `src/lib/cards.ts`: `getCards` (order by version asc), `getLatestCard` (highest version with isEditable), `createCard` (auto-closes the editable card, computes next version, sets new card editable), `updateCard` (only editable), `deleteCard` (only editable; makes the next-highest-version previous card editable).
- `src/types/index.ts`: `Card.version: number`.
- `src/stores/cardStore.ts`: optimistic `createCard` computes the new card's version, marks ALL editable cards completed/non-editable, and posts to /api/cards. It uses `_mutationVersion` to invalidate stale fetches.
- `src/lib/latestCards.ts`: stream "latest card" concept (highest-versioned card) used by the latest-cards page and `LatestCardTile`.
- `src/hooks/useFilteredStreams.ts`: comment equates "latest card" with highest version.
- UI/components using `card.version`: `CardItem.tsx`, `LatestCardTile.tsx`, `StreamCardsModal.tsx` (two places), `StreamRow.tsx`, `CardEditor.tsx`, `EmptyState.tsx`, `src/db/seed.ts` (assigns versions).
- `src/mcp/server.ts` — DO NOT MODIFY. It references `version` and will be stale; it will be overhauled later. List in your summary the MCP integration points that are now stale.

REQUIREMENTS
------------

1. DATA MODEL — join table + drop version
   - New table `card_links` (or `card_dependencies`):
     - `id` (text uuid primary key — match existing uuid id style)
     - `sourceCardId` (text, FK -> cards.id, ON DELETE CASCADE)
     - `targetCardId` (text, FK -> cards.id, ON DELETE CASCADE)
     - `createdAt` (text ISO, default now — matching existing timestamp style)
   - UNIQUE(sourceCardId, targetCardId).
   - DROP `version` and the `stream_version_idx` index from `cards`. Do NOT remove or rewrite any existing cards' content. Keep `isEditable` (still reflects "leaf" for the current UI) and `streamId`.
   - Update `src/db/schema.ts`, `src/types/index.ts` (Card loses `version`), seed, and all type-level references.

2. MIGRATION — convert existing sequential data
   - Write a migration that, in one go:
     a. Creates `card_links`.
     b. Seeds links: for every stream, sort cards by `version` ascending; for every consecutive pair (card[i] -> card[i+1]) insert a row, with ON CONFLICT DO NOTHING so it is idempotent.
     c. Drops `stream_version_idx` and the `version` column.
   - Keep it idempotent and non-destructive to card content. Use the project's existing Drizzle migration workflow (check `drizzle.config.ts` / `npm run db:push` and `drizzle/pg/`); verify the migration matches the schema after push. Report the migration strategy in your summary.

3. VALIDATION — `src/lib/validations.ts`
   - Zod schemas:
     - Card creation: `{ streamId: uuid, content: string, metadata?, sourceCardId: uuid (required UNLESS the stream is empty — the root card) }`.
     - Link creation/removal: `{ sourceCardId: uuid, targetCardId: uuid }`.
   - Reject (with clear messages): self-links; cross-stream links; either card missing or not owned by the user; duplicate links (friendly 409/400, not a raw DB error); CYCLES as defined in INVARIANTS; a non-root card created without a source card; a source card that is not in the same stream as the new card.
   - All enforcement server-side; no UI cycle detection.

4. LINK LOGIC — `src/lib/cards.ts` (or a new `src/lib/cardLinks.ts`)
   - Centralized: `getNextCards(cardId, userId)`, `getPreviousCards(cardId, userId)`, `addCardLink(sourceId, targetId, userId)`, `removeCardLink(sourceId, targetId, userId)`.
   - Use indexed joins; single grouped query per list of cards — no O(n^2) per-card lookups.
   - Mirror semantics derived from the reverse join; no separate "previous" storage.
   - Transactions: create the new card AND insert the source->new link in one transaction; deleting a card and cascading its links and re-marking source cards editable in one transaction.
   - A card is "leaf" iff it has zero outgoing links; treat `isEditable` as the cached leaf flag. Whenever a card gains its first outgoing link, set `isEditable: false` and (if it was editable) set metadata.status to "completed", preserving the rest of its metadata.

5. CARD CREATION — always from an existing card
   - POST /api/cards accepts `{ streamId, content, metadata?, sourceCardId }` where `sourceCardId` is REQUIRED unless the stream has zero cards (the root card).
   - The source card must exist, be owned by the user, and be in the same stream. The source loses leaf/editable status (and is marked completed, preserving other metadata); the new card is a leaf (isEditable: true).
   - The new card gets no `version`; it is linked to its source via `card_links`.
   - Update the optimistic update in `cardStore` accordingly (drop the optimistic version computation; optimistically mark ONLY the source card completed/non-editable — not all editable cards).
   - The previous "single editable card" pattern is gone: there can be multiple editable cards per stream.

6. EDITING — only leaf (editable) cards can be edited; keep `updateCard` semantics, generalized to multiple editable cards per stream.

7. DELETION — leaf cards only
   - `deleteCard` must reject non-leaf cards with a clear 400/409 message ("Card has next links; only leaf cards can be deleted").
   - On leaf deletion: cascade removes all links; the deleted card disappears; any card whose outgoing links were entirely to the deleted card (and now has none) becomes editable (isEditable: true), preserving its metadata.
   - The old "make highest-version previous card editable" logic is replaced by the cascade-driven rule above.

8. API — `src/app/api/cards/...` (follow existing route handler style and Zod patterns)
   - Card creation: accepts `sourceCardId` (required unless root). Response stays compatible with the existing client (a single card).
   - Link endpoints (recommended for MCP/UI completeness): `POST /api/cards/:id/next` (body: `{ targetCardId }`) and `DELETE /api/cards/:id/next/:targetId` — return the updated card with resolved previous/next arrays (ordered deterministically by createdAt, then id).
   - Error contract: 400 validation (self/cross-stream/cycle/duplicate/missing source/not leaf), 404 missing/unowned card or stream, 500 unexpected (safe message, no stack traces).
   - Update GET card/stream-cards responses to include resolved previous/next arrays if they do not already; otherwise leave shape as-is for the client.

9. UI — implicit links + "branch here" + vertical sibling stacking (minimal churn)
   - Do NOT render links/edges/graph views. The branching is implicit.
   - Update the board rendering so that cards sharing the same "previous" card are displayed one below the other vertically (siblings stacked under their parent), replacing the linear version-order rendering. Roots (single per stream) and siblings ordered by createdAt then id. Keep styling consistent with the existing Tailwind v4 design system.
   - Add a "branch here" affordance on any card in the board: clicking it opens the new-card editor with the new card linked to THAT card (pass `sourceCardId` to the create flow). The new card appears stacked with its siblings.
   - Remove all version displays: `CardItem.tsx`, `LatestCardTile.tsx` (v{...} badge), `StreamCardsModal.tsx` (two places), `StreamRow.tsx` ("older versions" summary — rework without versions), `CardEditor.tsx` ("Saving creates a new version" copy — reword), `EmptyState.tsx` (version-preservation copy — reword to "previous cards are preserved"), `useFilteredStreams.ts` ("latest card = last element" comment — rework). Remove `version` from `CardItem`, `LatestCardTile`, `StreamCardsModal`, and the seed.
   - Update "latest card" concepts: a stream may have multiple latest cards. `LatestCardTile` / latest-cards page should consider ALL leaf cards or explicitly rename to "leaf cards"; keep the feature working.
   - Update the Zustand store and hooks to drop all `version` usage (optimistic create, `_mutationVersion` may remain for fetch invalidation but nothing here uses it for numbering) and fix the stream/card fetch flow to be compatible with multiple leaves.
   - Persist behavior in localStorage and Clerk auth are unchanged.

10. MCP SERVER — DO NOT MODIFY. It references `version` and will compile-stale/be wrong; it will be overhauled later. List in your summary the MCP integration points that are now stale (e.g. version-based latest-card lookup, create-without-source semantics).

11. SEED — `src/db/seed.ts`
   - Remove `version` from inserted cards; keep the same content/structure otherwise. Seeded stream contents must still form a sequential chain through the link model so existing data has the same 1->1 shape as pre-migration.

12. TESTING
   - Unit (no DB): Zod schemas (self/duplicate/cross-stream/missing source/bad uuid), the cycle-detection DFS (reject when target can reach source, including S == T), leaf detection, grouping-by-parent layout logic if extracted.
   - Integration (real DB; existing `test-integration-*` isolation pattern): create card with source, mirror semantics, cascade delete, cycle/self/duplicate rejection, per-user isolation, leaf-only deletion, multiple editable cards per stream.
   - Run `npm test` (and the integration config); fix all failures.

13. DOCUMENTATION & CLEANUP
   - Update AGENTS.md / docs with: the `card_links` model, the single-root invariant, the create-from-any-card flow (plus the root exception), leaf-only deletion, and the new API contract.
   - Remove superseded version-order assumptions everywhere (schema, types, lib, stores, components, seed). No dead code or stale types.
   - Report in your summary: the migration strategy, the "branch here" UI behavior, the API contract (endpoint names + request/response shapes), and the known-stale MCP server integration points.

QUALITY BAR
-----------
- TypeScript strict mode; explicit types; avoid `any` except in the db layer.
- Zod for all API input; no business logic in route handlers.
- Correctness and reliability over cleverness; minimal external dependencies.
- Run `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run test:integration` and fix all failures before reporting DONE (the harness re-runs them independently). Do not touch the MCP server.

## Definition of done

- [ ] Cards carry no `version`; the column and its index are dropped by a migration that converts existing sequential data into `card_links` (idempotent, non-destructive).
- [ ] `card_links` (source -> target) is the only source of truth for next/previous; mirror semantics hold; duplicate/self/cycle/cross-stream links are rejected server-side.
- [ ] Card creation is always from an existing card (new root exception); "branch here" UI lets the user create a next card from ANY card in the sequence.
- [ ] Only leaf cards can be deleted; deletion cascades links and re-marks source cards editable; multiple editable cards per stream are supported.
- [ ] Version displays and related copy removed; siblings stack vertically; multiple latest/leaf cards per stream work.
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run test:integration` all pass (run them yourself; the harness verifies independently).
- [ ] MCP server untouched; stale MCP integration points listed in the final summary.

## Run log

-   All four checks pass already. Let me audit the task requirements against the current state — the previous attempt may have been incomplete.
-   Now I'll fix the one real bug I found: the "New card" button in StreamRow opens the editor with no `sourceCardId`, which fails with a 400 once a stream has cards. The modal should default the source to the newest leaf card.
-   Now let me extract the "newest leaf card" logic into a pure, testable helper and use it in the modal:
-   All checks pass. Let me do a final review of the modal diff to confirm coherence:
-   Everything is verified and green. The previous attempt had already implemented the bulk of the task; I audited it, fixed the one real gap I found (the "New card" button created a card without a `sourceCardId`, which the server now rejects once a stream has cards), removed dead code, added tests, and re-ran everything.
-   Summary of the state of the work:
-   **Data model / migration** — `card_links` table (`id`, `sourceCardId` FK→cards ON DELETE CASCADE, `targetCardId` FK→cards ON DELETE CASCADE, `createdAt`; UNIQUE(sourceCardId, targetCardId)); `cards.version` and `stream_version_idx` dropped. Migration `drizzle/pg/0003_card_links.sql` creates the table, seeds one link per consecutive pair ordered by `version` ASC (`ON CONFLICT DO NOTHING`, `created_at` pinned to target's), drops the index and column — idempotent and non-destructive to card content.
-   **Logic** — `src/lib/cardLinks.ts` (centralized `addCardLink`/`removeCardLink`/`getNextCards`/`getPreviousCards`, single grouped queries, reverse-join mirror semantics, source marked completed/non-editable on first outgoing link, re-mark editable on last-link removal, transactional); `src/lib/linkGraph.ts` (pure DFS cycle detection, also rejects S == T); `src/lib/cards.ts` (root-exception create with required `sourceCardId`, leaf-only edit/delete, cascade re-mark of orphaned sources); `src/lib/cardLayout.ts` (tree build + `getNewestLeafCard`); `src/lib/latestCards.ts` (all leaf cards per stream, tree order).
-   **API** — `POST /api/cards` (201, sourceCardId required unless empty stream), `POST /api/cards/:id/next` (201 + resolved previous/next), `DELETE /api/cards/:id/next/:targetId` (updated card), GET/PATCH/DELETE with resolved relations; 400 validation / 404 ownership / 409 conflicts / 401 / 500.
-   **UI** — links implicit; board shows siblings stacked vertically under parent (`StreamRow` + `buildCardTree`); "branch here" button on any card; "New card" now defaults to branching from the newest leaf card (the fix I made); version displays/copy removed; `LeafCardTile` replaces `LatestCardTile` (all leaves).
-   **Tests** — unit (validations, link graph cycle detection, layout, stores, newest-leaf helper) and integration (root create, source requirement, mirror semantics, cascade delete, cycle/self/duplicate/cross-stream/per-user rejection, leaf-only deletion, multiple editables per stream, leaf-cards-per-workspace).
-   **Verification** — `npm test` (129 pass), `npm run lint` (0 errors, 8 pre-existing warnings), `npx tsc --noEmit` (clean), `npm run test:integration` (39 pass).
-   **Stale MCP server integration points (untouched, per task)**: `src/mcp/server.ts:40` (`version: number` in card type), `:232` (`version: "1.0.0"` in server info), `:335` ("automatically close the previous editable card version" copy), `:388` (`.sort((a, b) => b.version - a.version)[0]` latest-card lookup); also its card-creation flow likely creates without `sourceCardId` (now required server-side for non-empty streams) and expects versioned ordering.
-   **Caveats**: the migration was applied to the dev DB (integration tests pass against it); I did not re-apply it to a fresh empty database. The empty `relationships/` dirs were removed; the unused inline `CardEditor.tsx` was deleted.
-   STATUS: DONE npm test (129), npm run lint (0 errors), npx tsc --noEmit (clean), npm run test:integration (39) all pass; fixed the New-card default branch source and removed dead code/stale version references
-   All four checks pass already. Let me audit the task requirements against the current state — the previous attempt may have been incomplete.
-   Now I'll fix the one real bug I found: the "New card" button in StreamRow opens the editor with no `sourceCardId`, which fails with a 400 once a stream has cards. The modal should default the source to the newest leaf card.
-   Now let me extract the "newest leaf card" logic into a pure, testable helper and use it in the modal:
-   All checks pass. Let me do a final review of the modal diff to confirm coherence:
-   Everything is verified and green. The previous attempt had already implemented the bulk of the task; I audited it, fixed the one real gap I found (the "New card" button created a card without a `sourceCardId`, which the server now rejects once a stream has cards), removed dead code, added tests, and re-ran everything.
-   Summary of the state of the work:
-   **Data model / migration** — `card_links` table (`id`, `sourceCardId` FK→cards ON DELETE CASCADE, `targetCardId` FK→cards ON DELETE CASCADE, `createdAt`; UNIQUE(sourceCardId, targetCardId)); `cards.version` and `stream_version_idx` dropped. Migration `drizzle/pg/0003_card_links.sql` creates the table, seeds one link per consecutive pair ordered by `version` ASC (`ON CONFLICT DO NOTHING`, `created_at` pinned to target's), drops the index and column — idempotent and non-destructive to card content.
-   **Logic** — `src/lib/cardLinks.ts` (centralized `addCardLink`/`removeCardLink`/`getNextCards`/`getPreviousCards`, single grouped queries, reverse-join mirror semantics, source marked completed/non-editable on first outgoing link, re-mark editable on last-link removal, transactional); `src/lib/linkGraph.ts` (pure DFS cycle detection, also rejects S == T); `src/lib/cards.ts` (root-exception create with required `sourceCardId`, leaf-only edit/delete, cascade re-mark of orphaned sources); `src/lib/cardLayout.ts` (tree build + `getNewestLeafCard`); `src/lib/latestCards.ts` (all leaf cards per stream, tree order).
-   **API** — `POST /api/cards` (201, sourceCardId required unless empty stream), `POST /api/cards/:id/next` (201 + resolved previous/next), `DELETE /api/cards/:id/next/:targetId` (updated card), GET/PATCH/DELETE with resolved relations; 400 validation / 404 ownership / 409 conflicts / 401 / 500.
-   **UI** — links implicit; board shows siblings stacked vertically under parent (`StreamRow` + `buildCardTree`); "branch here" button on any card; "New card" now defaults to branching from the newest leaf card (the fix I made); version displays/copy removed; `LeafCardTile` replaces `LatestCardTile` (all leaves).
-   **Tests** — unit (validations, link graph cycle detection, layout, stores, newest-leaf helper) and integration (root create, source requirement, mirror semantics, cascade delete, cycle/self/duplicate/cross-stream/per-user rejection, leaf-only deletion, multiple editables per stream, leaf-cards-per-workspace).
-   **Verification** — `npm test` (129 pass), `npm run lint` (0 errors, 8 pre-existing warnings), `npx tsc --noEmit` (clean), `npm run test:integration` (39 pass).
-   **Stale MCP server integration points (untouched, per task)**: `src/mcp/server.ts:40` (`version: number` in card type), `:232` (`version: "1.0.0"` in server info), `:335` ("automatically close the previous editable card version" copy), `:388` (`.sort((a, b) => b.version - a.version)[0]` latest-card lookup); also its card-creation flow likely creates without `sourceCardId` (now required server-side for non-empty streams) and expects versioned ordering.
-   **Caveats**: the migration was applied to the dev DB (integration tests pass against it); I did not re-apply it to a fresh empty database. The empty `relationships/` dirs were removed; the unused inline `CardEditor.tsx` was deleted.
-   STATUS: DONE npm test (129), npm run lint (0 errors), npx tsc --noEmit (clean), npm run test:integration (39) all pass; fixed the New-card default branch source and removed dead code/stale version references
