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
