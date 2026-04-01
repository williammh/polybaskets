// In-memory cache with TTL expiration (replaces Redis)

const MAX_CACHE_SIZE = 500

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const cache = new Map<string, CacheEntry<any>>()

function evictExpired() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key)
    }
  }
}

function evictOldest() {
  if (cache.size < MAX_CACHE_SIZE) return
  // Remove oldest 10% of entries
  const entries = [...cache.entries()]
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
  const toRemove = Math.max(1, Math.floor(entries.length * 0.1))
  for (let i = 0; i < toRemove; i++) {
    cache.delete(entries[i][0])
  }
}

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  evictOldest()
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs })
}

export async function getOrSetCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const cached = getCached<T>(key)
  if (cached !== null) return cached
  const data = await fetcher()
  setCached(key, data, ttlMs)
  return data
}

export function clearCache(): void {
  cache.clear()
}

// Periodically clean expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(evictExpired, 60_000)
}

// Cache TTLs (milliseconds)
export const CACHE_TTL = {
  USER_DATA: 10 * 60 * 1000,
  LEADERBOARD: 10 * 60 * 1000,
  EVENT_DATA: 5 * 60 * 1000,
  POSITIONS: 2 * 60 * 1000,
}

// Cache key generators (ported from redis.ts)
export function getUserCacheKey(userId: string): string {
  return `user:${userId}`
}

export function getUserTradesCacheKey(userId: string, filters: Record<string, any>): string {
  const sortedParams = Object.keys(filters).sort().map(k => `${k}=${filters[k]}`).join('&')
  return `user:${userId}:trades:${sortedParams}`
}

export function getUserClosedPositionsCacheKey(userId: string, filters: Record<string, any>): string {
  const sortedParams = Object.keys(filters).sort().map(k => `${k}=${filters[k]}`).join('&')
  return `user:${userId}:closed-positions:${sortedParams}`
}

export function getEventCacheKey(slug: string, includeChat?: boolean, includeTemplate?: boolean): string {
  return `event:${slug}:chat:${includeChat ?? false}:template:${includeTemplate ?? false}`
}

export function getMarketCacheKey(slug: string, includeTag?: boolean): string {
  return `market:${slug}:tag:${includeTag ?? false}`
}

export function getLeaderboardCacheKey(filters?: any, maxPages?: number, offset?: number): string {
  const sortedParams = filters
    ? Object.keys(filters).sort().map(k => `${k}=${filters[k]}`).join('&')
    : ''
  return `leaderboard:${sortedParams}:pages:${maxPages}:offset:${offset}`
}
