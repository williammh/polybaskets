# Copilot Instructions - Polybaskets

## Project Overview
**Polybaskets** is a Next.js app for fast, granular lookup of any Polymarket user's performance betting on NBA basketball. Search by username or wallet address; see win rate, P&L, and every position filtered to NBA markets only.

**No authentication. No database. No Redis. No environment variables required.**

**Tech Stack:**
- Next.js (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui components
- In-memory caching (`lib/cache.ts`) with TTL eviction — no external cache
- Axios for server-side Polymarket API calls
- Polymarket Public Data API (no API key required)
- Playwright for E2E testing, Vitest for unit tests

## Architecture

### Data Flow
1. **Search** (`/api/search`): Proxies username/address queries to Polymarket user search API
2. **NBA Profile** (`/api/users/[userId]/nba-profile`): Fetches all positions in parallel, filters to NBA markets, aggregates stats
3. **In-Memory Cache** (`lib/cache.ts`): TTL-based `Map` cache shared across server-side API calls — capped at 500 entries with LRU-style eviction
4. **UI** (`components/user-profile.tsx`): Client component — fetches from API routes, renders sortable/filterable position tables

### Key Files
- **`lib/nba.ts`**: NBA market detection and filtering logic — single source of truth for what counts as an NBA market
- **`lib/polymarket.ts`**: Server-side Polymarket API client (singleton) using `lib/cache.ts` for caching
- **`lib/polymarket-client.ts`**: Client-side Polymarket API helpers with their own in-memory caches
- **`lib/cache.ts`**: In-memory `Map`-based cache with `getOrSetCached` helper, TTL expiration, and size eviction
- **`lib/types/polymarket.ts`**: All TypeScript types and interfaces

### NBA Filtering (`lib/nba.ts`)
A position is treated as NBA if any of:
- Title contains `\bNBA\b`
- `eventSlug` starts with `nba-`
- Tags include slug `nba`

Excluded if title matches international league patterns (EuroLeague, FIBA, CBA, KBL, PBA, BBL, etc.).

### Caching Pattern
```typescript
// lib/cache.ts — use getOrSetCached everywhere
const data = await getOrSetCached(
  cacheKey,
  async () => await fetchFromAPI(),
  TTL_MS
)
```

Cache TTLs in use:
- Closed positions: 10 min
- Open positions: 2 min
- Traded markets: 10 min
- Search results: 5 min

## File Organization

```
app/
├── page.tsx                        # Search homepage
├── [proxyWallet]/page.tsx          # Proxy wallet redirect
├── user/[userId]/page.tsx          # User profile page
└── api/
    ├── search/route.ts             # Username/address search
    └── users/[userId]/
        ├── nba-profile/route.ts    # Aggregated NBA stats
        ├── positions/
        │   ├── open/route.ts       # Open positions
        │   └── closed/route.ts     # Closed positions
        ├── trades/route.ts         # Trade history
        └── predictions/route.ts   # Predictions

components/
├── search-input.tsx                # Search bar with autocomplete
├── user-profile.tsx                # Full profile + position tables (client)
├── user-skeleton.tsx               # Loading skeleton
└── ui/                             # shadcn/ui components

lib/
├── nba.ts                          # NBA market filtering
├── polymarket.ts                   # Server-side API client
├── polymarket-client.ts            # Client-side API helpers
├── cache.ts                        # In-memory TTL cache
├── types/polymarket.ts             # TypeScript types
└── utils.ts                        # cn() helper
```

## Development Workflow

### Setup
```bash
npm install
npm run dev       # localhost:3000
```

No `.env` setup required — the app calls Polymarket's public API directly with no secrets.

### Commands
```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Playwright E2E tests (headless)
npm run test:ui      # Playwright UI mode
npm run test:headed  # Playwright with browser visible
npm run test:unit    # Vitest unit tests
```

### Tests
- `tests/home.spec.ts`: Landing page
- `tests/search.spec.ts`: Search functionality
- `tests/nba-profile.spec.ts`: NBA profile page
- `lib/__tests__/nba.test.ts`: NBA filtering logic (Vitest)
- `lib/__tests__/cache.test.ts`: Cache behavior (Vitest)

## Patterns & Practices

**Server vs Client Components:**
- Pages and API routes are Server Components by default
- `user-profile.tsx` and `search-input.tsx` are `"use client"` — they manage local state and call API routes via `fetch`

**API Route Pattern:**
```typescript
export async function GET(request: NextRequest, { params }) {
  const { userId } = await params
  const profile = await getUserNBAProfile(userId)
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(profile)
}
```

**Type Safety:**
- All Polymarket data uses types from `lib/types/polymarket.ts`
- `NBAUserProfile` is the main aggregated type returned by `getUserNBAProfile()`
- Null-safe numeric coercion with `n(value)` pattern in `user-profile.tsx`

## Polymarket API

- **Gamma API**: `https://gamma-api.polymarket.com` — markets, events, profiles
- **Data API**: `https://data-api.polymarket.com` — positions, trades, leaderboard
- No API key required
- All calls go through `polymarketAPI` singleton on the server side

