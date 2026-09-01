# MTG Arena Tracker — Design Spec

Date: 2026-09-01

## Overview

An internal web app for a team that plays MTG Arena matches against each
other every Friday. It tracks team members, generates round-robin
matchups for a "season," records match results, and maintains an ELO
leaderboard. Runs via Docker Compose (Next.js app + PostgreSQL),
deployed later behind a Cloudflare Tunnel. No authentication — anyone
with the link can act as any member (trusted internal tool).

## Goals

- Manage a roster of team members with names and uploaded avatars.
- Start a "season": pick active members, auto-generate a full
  round-robin schedule (everyone plays everyone once).
- Show upcoming/pending matchups for the current season.
- Record match results (single winner/loser or draw, trust-based,
  no confirmation step).
- Maintain an ELO rating per member, updated on every recorded result.
- Show a leaderboard ranked by ELO with W/L/D record.
- Archive members (soft-delete) without losing their match history.
- Fun, energetic visual theme loosely inspired by Credo Group's brand
  colors, running dark with a neon-cyan accent.
- Ship as `docker compose up` with Postgres included; no external
  dependencies besides the tunnel, which is out of scope.

## Non-goals

- No authentication/authorization — this is an internal, single-tunnel
  tool. Anyone with network access can perform any action.
- No best-of-N game tracking — a match is a single win/loss/draw.
- No match result confirmation/dispute workflow.
- No support for multiple concurrent active seasons.
- No email/notifications.

## Tech stack

- **Next.js 14** (App Router, TypeScript) — single deployable serving
  both UI and API routes.
- **Prisma ORM** + **PostgreSQL 16**.
- **Tailwind CSS** for styling.
- **Vitest** for unit tests.
- **Docker Compose** for local/prod runtime: `web` + `db` services.

## Architecture

```
┌─────────────────────────────┐
│         web (Next.js)       │
│  - App Router pages (UI)    │
│  - Route handlers (API)     │
│  - Prisma client            │
│  - Avatar file storage      │──── volume: /app/uploads
└──────────────┬───────────────┘
               │ DATABASE_URL
┌──────────────▼───────────────┐
│      db (postgres:16)        │──── volume: pgdata
└───────────────────────────────┘
```

The `web` container runs an entrypoint that executes
`prisma migrate deploy` before starting the Next.js server, so schema
setup is automatic on `docker compose up`.

Identity: a simple "who are you" picker on first visit stores the
selected `memberId` in a cookie (`current_member`). It's used only to
pre-fill "who recorded this" / personalize the UI — it is **not**
security, any user can switch to any member at any time via a
"switch profile" control.

## Data model (Prisma schema)

```prisma
model Member {
  id          String   @id @default(cuid())
  name        String   @unique
  avatarPath  String?
  elo         Int      @default(1200)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  seasonEntries   SeasonParticipant[]
  matchesAsPlayer1 Matchup[] @relation("player1")
  matchesAsPlayer2 Matchup[] @relation("player2")
  resultsWon      MatchResult[] @relation("winner")
  resultsLost     MatchResult[] @relation("loser")
}

model Season {
  id        String   @id @default(cuid())
  name      String
  status    SeasonStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  completedAt DateTime?

  participants SeasonParticipant[]
  matchups     Matchup[]
}

enum SeasonStatus {
  ACTIVE
  COMPLETED
}

model SeasonParticipant {
  seasonId String
  memberId String
  season   Season @relation(fields: [seasonId], references: [id])
  member   Member @relation(fields: [memberId], references: [id])

  @@id([seasonId, memberId])
}

model Matchup {
  id        String   @id @default(cuid())
  seasonId  String
  round     Int
  player1Id String
  player2Id String
  status    MatchupStatus @default(PENDING)
  createdAt DateTime @default(now())

  season  Season @relation(fields: [seasonId], references: [id])
  player1 Member @relation("player1", fields: [player1Id], references: [id])
  player2 Member @relation("player2", fields: [player2Id], references: [id])
  result  MatchResult?
}

enum MatchupStatus {
  PENDING
  COMPLETED
}

model MatchResult {
  id             String   @id @default(cuid())
  matchupId      String   @unique
  winnerId       String?
  loserId        String?
  isDraw         Boolean  @default(false)
  player1EloBefore Int
  player1EloAfter  Int
  player2EloBefore Int
  player2EloAfter  Int
  recordedAt     DateTime @default(now())

  matchup Matchup @relation(fields: [matchupId], references: [id])
  winner  Member? @relation("winner", fields: [winnerId], references: [id])
  loser   Member? @relation("loser", fields: [loserId], references: [id])
}
```

Only one `Season` may have `status = ACTIVE` at a time; enforced in
application logic (checked before creating a new season).

## Core flows

### Roster management
- `GET/POST /api/members` — list members (active + archived, filterable),
  create a member (name + optional avatar upload, multipart form).
- `PATCH /api/members/:id` — update name/avatar, toggle `active`.
- Avatar upload: validated to image mime types (png/jpg/webp), max 5MB,
  saved to `/app/uploads/<cuid>.<ext>`, path stored on `Member.avatarPath`.
- `GET /api/avatars/:filename` — route handler that streams the file
  from the uploads volume with the correct content-type.

### Starting a season
- UI: "Start Season" page lists active members with checkboxes,
  requires ≥2 selected, requires no other season currently `ACTIVE`.
- `POST /api/seasons` generates the schedule using the **circle
  method**: for N players, if N is odd add a placeholder "bye"; run
  N-1 (even) or N (odd, with bye rounds skipped) rounds, rotating all
  but one fixed player each round. Persists `Season`,
  `SeasonParticipant` rows, and all `Matchup` rows with their `round`.
- Matchups are shuffled (random pairing seed) before assignment so the
  order isn't predictable/alphabetical.

### Dashboard — upcoming matchups
- `GET /api/seasons/active` returns the active season with its
  matchups grouped by round and status.
- Home page shows: current season name, pending matchups (grouped by
  round), each with both players' avatar + name, and a "record result"
  action.

### Recording a result
- `POST /api/matchups/:id/result` body: `{ winnerId | isDraw: true }`.
- Server loads both members' current ELO, computes new ratings with
  the standard ELO formula, writes `MatchResult` with before/after
  snapshots, updates both `Member.elo`, marks `Matchup.status =
  COMPLETED`, all inside a single DB transaction.
- If this was the last pending matchup in the season, mark the season
  `COMPLETED` (`completedAt` set) in the same transaction.

### ELO calculation
Standard ELO, K=32, starting rating 1200:

```
expectedA = 1 / (1 + 10^((ratingB - ratingA) / 400))
newRatingA = ratingA + K * (scoreA - expectedA)
```
`scoreA` is 1 for a win, 0 for a loss, 0.5 for a draw. Implemented as a
pure, unit-tested function (`lib/elo.ts`).

### Leaderboard
- `GET /api/leaderboard` returns active members sorted by `elo` desc,
  with aggregated W/L/D counts (derived from `MatchResult` rows).
- UI: ranked list/table with avatar, name, ELO, record, rank badge for
  top 3.

### Season history
- Completed seasons remain browsable (list + detail showing final
  standings and all match results) for posterity.

## Theming

Dark, energetic "game night" aesthetic lightly derived from Credo
Group's brand palette (extracted from their public site CSS):

- Background: near-black slate `#181c22` / `#212529`, cards in
  `#2C3342`.
- Primary accent (buttons, glowing highlights, active states):
  electric cyan `#00C0F3` / `#00AEEF`.
- Secondary accent (gradients, section dividers, badges): deep navy
  `#00568C` and muted plum `#504157`.
- Typography: a clean geometric sans (e.g. Inter) for body text; bold
  weight + subtle cyan text-glow (`text-shadow`) for headings/scores to
  give a "tournament arena" feel.
- Motion: light hover/press transitions and a subtle glow pulse on the
  leaderboard's #1 spot — kept tasteful, not gimmicky.

Implemented as Tailwind theme tokens (`tailwind.config.ts`) so colors
are defined once and reused consistently.

## Error handling

- API route handlers validate input (zod schemas) and return 4xx with
  a message on invalid input (e.g. starting a season with <2 members,
  recording a result for an already-completed matchup, duplicate
  member name).
- Avatar upload rejects non-image mime types and oversized files with
  a clear error surfaced in the UI.
- Attempting to start a season while one is already active is
  rejected with a 409 and a UI message pointing at the active season.

## Testing

- Unit tests (Vitest) for:
  - `lib/elo.ts` — rating calculation for win/loss/draw, edge cases
    (equal ratings, large rating gaps).
  - `lib/roundRobin.ts` — schedule generation for even/odd player
    counts, verifying every pair plays exactly once and round counts
    are correct.
- No e2e test suite for this initial build (small internal tool);
  manual verification of the UI flows before considering done.

## Deployment

- `Dockerfile`: multi-stage build producing a Next.js `standalone`
  output; final stage copies the standalone server, static assets, and
  Prisma client; entrypoint script runs `npx prisma migrate deploy`
  then starts the server.
- `docker-compose.yml`:
  - `db`: `postgres:16-alpine`, named volume `pgdata` for
    `/var/lib/postgresql/data`, env vars for user/password/db name.
  - `web`: builds from the `Dockerfile`, depends on `db` (with a
    healthcheck), env `DATABASE_URL` pointing at `db`, named volume
    `uploads` mounted at `/app/uploads`, exposes port 3000.
- `.env.example` documents `POSTGRES_USER`, `POSTGRES_PASSWORD`,
  `POSTGRES_DB`, `DATABASE_URL`.
- The app uses only relative URLs/paths so it works unmodified behind
  a Cloudflare Tunnel pointed at `http://web:3000` (or the host port).

## Repo layout (high level)

```
/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                # Next.js App Router pages + API routes
│   ├── components/
│   ├── lib/                # elo.ts, roundRobin.ts, prisma.ts, etc.
│   └── styles/
└── docs/superpowers/specs/
```
