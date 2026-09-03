# MTG Arena Tracker

Internal web app for tracking Friday-night MTG Arena matches between team
members: roster management with avatars, round-robin season scheduling,
trust-based result recording, and an ELO leaderboard. No authentication —
anyone with the link can act as any member.

Design spec: [`docs/superpowers/specs/2026-09-01-mtg-arena-tracker-design.md`](docs/superpowers/specs/2026-09-01-mtg-arena-tracker-design.md)

## Decks on roster profiles

Each duelist's profile (`Roster → Decks`) hosts their decks. To add one,
open the deck in MTG Arena, click **Export**, and paste the clipboard into
the import form. The list is parsed (`4 Card Name (SET) 123` lines,
`Deck`/`Commander`/`Sideboard`/`Companion` sections), card details and
artwork are fetched from [Scryfall](https://scryfall.com)'s API, and the
art is stored locally in the `uploads` volume. Cards Scryfall can't match
are kept as plain entries with a warning; decks can be deleted from their
header.

## Run it (Docker)

```bash
cp .env.example .env   # adjust passwords if you like
docker compose up --build -d
```

The `web` container runs `prisma migrate deploy` on boot, so the schema is
set up automatically. The app listens on http://localhost:3000 — put a
Cloudflare Tunnel (or any reverse proxy) in front of it; the app only uses
relative URLs, so no config changes are needed.

## Local development

```bash
npm install
docker compose up -d db          # Postgres on localhost:5432
DATABASE_URL="postgresql://arena:arena-dev@localhost:5432/mtg_arena?schema=public" npx prisma migrate deploy
npm run dev                      # http://localhost:3000
```

## Tests

```bash
npm test        # Vitest unit tests (ELO math, round-robin scheduling)
```

## Stack

- Next.js 14 (App Router, TypeScript) — UI + API route handlers
- Prisma + PostgreSQL 16
- Tailwind CSS (dark theme, neon-cyan accent)
- Vitest for unit tests
- Docker Compose: `web` + `db`, named volumes for Postgres data and uploads

## Theme & artwork

The UI keeps Credo Group's brand palette (electric cyan `#00C0F3`, navy
`#00568C`, plum `#504157`) on a dark "game night" base, with Cinzel
(engraved Trajan-style caps, the MTG logo look) for display headings and
MTG card-art banners on each page.

The banner art in `public/art/` was sourced from
[Scryfall](https://scryfall.com) and is © Wizards of the Coast LLC. It is
used under the [Wizards of the Coast Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy)
— this is an unofficial, non-commercial fan tool and is not affiliated
with or endorsed by Wizards of the Coast. The same applies to the deck
card artwork downloaded from Scryfall at import time. Replace the files in
`public/art/` if that ever stops fitting your use case.
