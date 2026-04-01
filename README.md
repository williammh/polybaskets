# Polybaskets

Fast, granular lookup of any Polymarket user's performance betting on NBA basketball.

Search by username or wallet address and get a full breakdown of their NBA betting history — win rate, P&L, every open and closed position, filterable by bet type and date.

## What it does

Search any Polymarket user by username or wallet address. The app pulls their full position history, filters it down to NBA markets only (ignoring EuroLeague, FIBA, CBA, etc.), and shows:

- **Win rate** across all NBA bets
- **Total P&L** (realized + unrealized)
- **Every position** — open and closed — in a sortable table
- **Bet type filter**: moneyline, over/under, or spread
- **Date filter**: cap results to a specific time window
- **Live stats** that update as you filter (bet count, cost basis, P&L, current value)

No account required. Just paste a username or address and go.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- In-memory cache with TTL eviction (no external dependencies)
- Polymarket public data API (no key required)
- Playwright for E2E tests, Vitest for unit tests

## Project structure

```
app/
├── page.tsx                          # Search homepage
├── user/[userId]/page.tsx            # User profile page
└── api/
    ├── search/route.ts               # Username/address search
    └── users/[userId]/
        ├── nba-profile/route.ts      # Aggregated NBA stats
        ├── positions/open/route.ts   # Open positions
        ├── positions/closed/route.ts # Closed positions
        └── trades/route.ts           # Trade history

components/
├── search-input.tsx                  # Search bar with autocomplete
└── user-profile.tsx                  # Profile page with stats + tables

lib/
├── nba.ts                            # NBA market detection & filtering
├── polymarket.ts                     # Server-side API client
├── polymarket-client.ts              # Client-side API helpers
├── cache.ts                          # In-memory TTL cache
└── types/polymarket.ts               # TypeScript types
```

## Getting started

```bash
npm install
npm run dev
```

No environment variables needed. Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Playwright tests (headless)
npm run test:ui      # Playwright UI mode
npm run test:headed  # Playwright with visible browser
```

## How NBA filtering works

The app fetches all of a user's positions from Polymarket, then filters server-side in `lib/nba.ts`. A position counts as NBA if:

- The title contains `NBA`
- The event slug starts with `nba-`
- Tags include `nba`

And it's excluded if the title matches known international leagues (EuroLeague, FIBA, CBA, KBL, PBA, etc.).

## Deployment

Deploy to Vercel. No environment variables or external services required — the in-memory cache is per-process and works fine in serverless.
