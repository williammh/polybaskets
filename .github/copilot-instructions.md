# Copilot Instructions - Resolution Research

## Project Overview
**Resolution Research** is a Next.js 15 Data Analytics platform for searching and analyzing Polymarket users by performance metrics. Built with TypeScript, Next.js App Router, shadcn/ui, Redis caching, and NextAuth for authentication.

**Tech Stack:**
- Next.js 15 with App Router & TypeScript
- Tailwind CSS + shadcn/ui components
- NextAuth (Google OAuth, Email requires database adapter) - Optional
- Redis for caching (5-10 minute TTL)
- Polymarket Public Data API (no API key required)
- Playwright for E2E testing
- Vercel deployment with cron jobs

## Architecture

### Data Flow
1. **API Layer** (`/app/api/*`): Next.js route handlers fetch from Polymarket API
2. **Caching Layer** (`lib/redis.ts`): Redis caches user data, stats, and search results
3. **Service Layer** (`lib/polymarket.ts`): Encapsulates Polymarket API logic
4. **UI Layer** (`app/` & `components/`): Server + Client Components with React Server Components pattern

### Key Components
- **Polymarket API Client** (`lib/polymarket.ts`): Singleton class handling all Polymarket API calls with automatic Redis caching
- **Redis Cache** (`lib/redis.ts`): Centralized caching with TTL management and helper functions
- **Auth System** (`auth.ts`): NextAuth v5 beta with middleware-based protection (optional)
- **Search System**: Client-side filters → API routes → cached or fresh Polymarket data
- **Public Dashboard**: Main search interface accessible without authentication

### Data Refresh Strategy
- **Vercel Cron** (`vercel.json`): Triggers `/api/refresh` every 10 minutes
- **Active Users**: Tracked in Redis set `active_users`
- **Batch Processing**: Refreshes user data in batches of 10

## Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env.local

# Required env variables:
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32) - Optional
# - REDIS_URL (local: redis://localhost:6379) - Required
# - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET - Optional
# - RESEND_API_KEY (for email auth) - Optional

# Start Redis locally (required)
docker run -d -p 6379:6379 redis:alpine
# OR use Upstash Redis for hosted solution
```

### Build & Run
```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm run test         # Run Playwright tests (headless)
npm run test:ui      # Run with Playwright UI mode
npm run test:headed  # Run with browser visible
```

**Test Coverage:**
- `tests/home.spec.ts`: Landing page and navigation
- `tests/auth.spec.ts`: Authentication flows
- `tests/search.spec.ts`: Search filters and results

## Code Conventions

### File Organization
```
app/
├── api/                      # API route handlers
│   ├── auth/[...nextauth]/  # NextAuth endpoints
│   ├── refresh/             # Cron job for cache refresh
│   └── users/               # User search & profile APIs
├── auth/signin/             # Authentication pages
├── dashboard/               # Protected dashboard area
│   ├── layout.tsx           # Dashboard layout with nav
│   ├── page.tsx             # Main search interface
│   └── users/[userId]/      # User profile pages
├── layout.tsx               # Root layout
└── page.tsx                 # Public landing page

components/
├── ui/                      # shadcn/ui components (auto-generated)
├── search-filters.tsx       # Search filter form (client)
└── user-results-table.tsx   # Search results display (client)

lib/
├── redis.ts                 # Redis client & cache utilities
├── polymarket.ts            # Polymarket API service layer
├── types/polymarket.ts      # TypeScript types & interfaces
└── utils.ts                 # shadcn utils (cn helper)
```

### Patterns & Practices

**1. Server vs Client Components:**
- **Server Components** (default): Pages that fetch data, layouts, static content
- **Client Components** (`"use client"`): Forms, interactive UI (search filters, tables with client state)
- Use Server Actions for mutations when possible

**2. API Route Structure:**
```typescript
// Pattern for API routes with caching
export async function GET(request: NextRequest) {
  const params = extractParams(request)
  const data = await polymarketAPI.method(params) // Auto-cached
  return NextResponse.json(data)
}
```

**3. Redis Caching Pattern:**
```typescript
// Use getOrSetCached for automatic cache management
const data = await getOrSetCached(
  cacheKey,
  async () => await fetchFromAPI(),
  CACHE_TTL.USER_DATA
)
```

**4. Type Safety:**
- All Polymarket data uses types from `lib/types/polymarket.ts`
- Transform API responses in `polymarketAPI` class to ensure consistent types
- Use Zod for runtime validation if needed

**5. Authentication:**
- Protected routes use middleware (`middleware.ts`) with `auth` from NextAuth
- Session available via `await auth()` in Server Components
- Use `signIn()` and `signOut()` from `next-auth/react` in Client Components

## Key Files & Directories

### Core Configuration
- **`auth.ts`**: NextAuth v5 configuration with Google & Email providers
- **`middleware.ts`**: Route protection (redirects unauthenticated users from `/dashboard/*`)
- **`vercel.json`**: Vercel cron configuration for 10-minute data refresh

### Service Layer
- **`lib/polymarket.ts`**: Main API client - all Polymarket interactions go through `polymarketAPI` singleton
- **`lib/redis.ts`**: Redis client and caching utilities - use exported helper functions
- **`lib/types/polymarket.ts`**: Type definitions and constants (CATEGORIES, search filters)

### API Endpoints
- **`/api/users/leaderboard`**: Get Polymarket leaderboard (GET with query params)
- **`/api/users/[userId]`**: Get user profile data
- **`/api/users/[userId]/stats`**: Get detailed user statistics
- **`/api/refresh`**: Cron endpoint for cache refresh (requires `CRON_SECRET`)

### UI Components
- **`components/search-filters.tsx`**: Main search form with category/subcategory selection
- **`components/user-results-table.tsx`**: Results display with user cards

## Dependencies & Integration

### Polymarket API
- **Base URL**: `https://gamma-api.polymarket.com` and `https://data-api.polymarket.com`
- **Authentication**: Public leaderboard API (no API key required for search functionality)
- **Rate Limits**: Unknown - handle gracefully with caching
- **Data Structure**: Transform raw API responses in `transformUserData()` and `transformPositionData()`
- **Current Status**: Using real leaderboard data for search functionality

### Redis Cache Structure
```
Keys:
- user:{userId}                     → PolymarketUser (10 min TTL)
- user:{userId}:stats               → UserStats (10 min TTL)
- search:{params}                   → SearchResult (5 min TTL)
- category:{category}               → Category data (30 min TTL)
- active_users                      → Set of user IDs to refresh
- last_refresh_timestamp            → Timestamp of last cron run
```

### NextAuth Configuration (Optional)
- **Providers**: Google OAuth (email requires database adapter - currently disabled)
- **Session Strategy**: JWT (no database required for OAuth)
- **Protected Routes**: Authentication optional - dashboard accessible without login
- **Callbacks**: Custom session callback adds user ID to session
- **Email Provider**: To enable email auth, configure a database adapter (Prisma, Drizzle, etc.)

### Vercel Cron
- **Schedule**: `*/10 * * * *` (every 10 minutes)
- **Endpoint**: `POST /api/refresh`
- **Auth**: Requires `CRON_SECRET` header for security

## Common Tasks

### Adding a New Search Filter
1. Add filter to `SearchFilters` interface in `lib/types/polymarket.ts`
2. Update `SearchFiltersState` in `components/search-filters.tsx`
3. Add UI input in `search-filters.tsx`
4. Update `buildSearchParams()` in `lib/polymarket.ts` to include new param
5. Modify cache key generation in `getSearchCacheKey()` if needed

### Adding a New Category/Subcategory
```typescript
// In lib/types/polymarket.ts
export const CATEGORIES: Record<string, string[]> = {
  sports: ["nba", "nfl", "ufc", "soccer", "baseball", "hockey", "new-sport"],
  // ...
}
```

### Debugging Cache Issues
```bash
# Connect to Redis locally
redis-cli

# Check cached keys
KEYS user:*
KEYS search:*

# Inspect specific key
GET user:123
TTL user:123

# Clear cache
FLUSHDB
```

### Testing API Endpoints Locally
```bash
# Search users
curl "http://localhost:3000/api/users/search?minWinRate=60&categories=sports"

# Get user profile
curl "http://localhost:3000/api/users/USER_ID"

# Trigger manual refresh (requires CRON_SECRET)
curl -X POST "http://localhost:3000/api/refresh" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Deploying to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# - All variables from .env.example
# - Use Upstash Redis for production (https://upstash.com)
# - Set CRON_SECRET for refresh endpoint
```

---

**Note**: This project uses Next.js 15 App Router patterns. Always use Server Components by default and add `"use client"` only when needed for interactivity.
