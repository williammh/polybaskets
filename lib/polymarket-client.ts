import axios from 'axios';

// Client-side API calls directly to Polymarket's public API
const dataClient = axios.create({
  baseURL: 'https://data-api.polymarket.com',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// Simple in-memory cache for event data
const eventCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of cached events

// Simple in-memory cache for traded data
const tradedCache = new Map<string, { data: any; timestamp: number }>();
const TRADED_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for traded data (less frequently changing)

// Simple in-memory cache for positions data
const positionsCache = new Map<string, { data: any; timestamp: number }>();
const POSITIONS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for positions (changes more frequently)

// Cache management function
function cleanExpiredCache() {
  const now = Date.now();
  // Clean event cache
  for (const [key, value] of eventCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      eventCache.delete(key);
    }
  }
  // Clean traded cache
  for (const [key, value] of tradedCache.entries()) {
    if (now - value.timestamp > TRADED_CACHE_DURATION) {
      tradedCache.delete(key);
    }
  }
  // Clean positions cache
  for (const [key, value] of positionsCache.entries()) {
    if (now - value.timestamp > POSITIONS_CACHE_DURATION) {
      positionsCache.delete(key);
    }
  }
}

// Function to clear event cache (useful for testing or manual cache invalidation)
export function clearEventCache() {
  eventCache.clear();
}

// Function to clear traded cache
export function clearTradedCache() {
  tradedCache.clear();
}

// Function to clear positions cache
export function clearPositionsCache() {
  positionsCache.clear();
}

export async function getPublicProfile(address: string) {
  try {
    const response = await axios.get(`/api/users/${address}/profile`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching public profile for address ${address}:`, error.message);
    return null;
  }
}

export async function getOpenPositions(userId: string, getTags: boolean = false) {
  // Create cache key that includes parameters
  const cacheKey = `${userId}:${getTags}`;
  
  // Check cache first
  const cached = positionsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < POSITIONS_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const params: Record<string, any> = {
      user: userId,
      sizeThreshold: 1,
      redeemable: false,
      mergeable: false,
      limit: 500,
      offset: 0,
    };

    const response = await dataClient.get('/positions', { params });

    if (!Array.isArray(response.data)) {
      console.warn('Unexpected positions response format:', response.data);
      return [];
    }

    // Enrich positions with event tags if requested
    const positions = await Promise.all(response.data.map(async (position: any) => {
      const enrichedPosition = {
        proxyWallet: position.proxyWallet,
        asset: position.asset,
        conditionId: position.conditionId,
        timestamp: position.timestamp !== undefined && position.timestamp !== null
          ? Number(position.timestamp)
          : position.createdAt
            ? Math.floor(new Date(position.createdAt).getTime() / 1000)
            : 0,
        size: position.size,
        avgPrice: position.avgPrice,
        initialValue: position.initialValue,
        currentValue: position.currentValue,
        cashPnl: position.cashPnl,
        percentPnl: position.percentPnl,
        totalBought: position.totalBought,
        realizedPnl: position.realizedPnl,
        percentRealizedPnl: position.percentRealizedPnl,
        curPrice: position.curPrice,
        redeemable: position.redeemable,
        mergeable: position.mergeable,
        title: position.title,
        slug: position.slug,
        icon: position.icon,
        eventSlug: position.eventSlug,
        outcome: position.outcome,
        outcomeIndex: position.outcomeIndex,
        oppositeOutcome: position.oppositeOutcome,
        oppositeAsset: position.oppositeAsset,
        endDate: position.endDate,
        negativeRisk: position.negativeRisk,
      };

      // Fetch event tags if getTags is true
      if (getTags && position.eventSlug) {
        try {
          const event = await getEventBySlug(position.eventSlug);
          if (event && event.tags) {
            (enrichedPosition as any).tags = event.tags;
          }
        } catch (error) {
          console.error(`Error fetching event tags for ${position.eventSlug}:`, error);
        }
      }

      return enrichedPosition;
    }));

    // Cache the result
    positionsCache.set(cacheKey, {
      data: positions,
      timestamp: Date.now()
    });

    return positions;
  } catch (error: any) {
    console.error('Error fetching open positions:', error.message);
    return [];
  }
}

export async function getEventBySlug(slug: string, includeChat?: boolean, includeTemplate?: boolean) {
  // Create cache key that includes parameters - handle undefined vs false properly
  const cacheKey = `${slug}:${includeChat === undefined ? 'undefined' : includeChat}:${includeTemplate === undefined ? 'undefined' : includeTemplate}`;

  // Check cache first
  const cached = eventCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  // Clean expired entries periodically (every 10 requests)
  if (Math.random() < 0.1) {
    cleanExpiredCache();
  }

  try {
    const params: Record<string, any> = {};
    if (includeChat !== undefined) {
      params.includeChat = includeChat;
    }
    if (includeTemplate !== undefined) {
      params.includeTemplate = includeTemplate;
    }

    const response = await axios.get(`/api/events/${slug}`, { params });
    const data = response.data;

    // Cache the result (with size management)
    if (eventCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry (simple LRU approximation)
      const firstKey = eventCache.keys().next().value;
      if (firstKey) {
        eventCache.delete(firstKey);
      }
    }

    eventCache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });


    return data
  } catch (error: any) {
    console.error(`Error fetching event by slug ${slug}:`, error.message)
    return null
  }
}

export async function getClosedPositions(userId: string, timePeriod?: string, maxTotal: number = 1000){
  try {
    const baseParams: Record<string, any> = {
      user: userId,
      limit: 50,
      sortBy: "TIMESTAMP",
      sortDirection: "DESC",
    };

    // Calculate cutoff date
    let cutoffDate: Date | null = null;
    if (timePeriod === 'MONTH') {
      cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else if (timePeriod === 'WEEK') {
      cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (timePeriod === 'DAY') {
      cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 1);
    }

    let allClosedPositions: any[] = [];
    let offset = 0;

    const maxPages = Math.ceil(maxTotal / baseParams.limit);

    for (let page = 0; page < maxPages; page++) {
      const params = { ...baseParams, offset };

      const response = await dataClient.get('/closed-positions', { params });
      const positions = Array.isArray(response.data) ? response.data : [];

      // Filter by cutoff date if set
      const filteredPositions = cutoffDate
        ? positions.filter(pos => new Date(pos.endDate) >= cutoffDate!)
        : positions;

      allClosedPositions.push(...filteredPositions);

      // Stop if we've reached the max total
      if (allClosedPositions.length >= maxTotal) {
        allClosedPositions = allClosedPositions.slice(0, maxTotal);
        break;
      }

      // If we got less than 50 positions, we've reached the end
      if (positions.length < 50) break;

      offset += 50;
    }

    console.log(`Total closed positions fetched for user ${userId}: ${allClosedPositions.length}`);

    // Enrich positions with event tags in parallel
    const enrichedPositions = await Promise.all(
      allClosedPositions.map(async (position) => {
        const enrichedPosition = { ...position };
        if (position.eventSlug) {
          try {
            const event = await getEventBySlug(position.eventSlug);
            if (event && event.tags) {
              enrichedPosition.tags = event.tags;
            }
          } catch (error) {
            console.error(`Error fetching event tags for ${position.eventSlug}:`, error);
          }
        }
        return enrichedPosition;
      })
    );
    return enrichedPositions;
  } catch (error: any) {
    console.error('Error fetching closed positions:', error.message);
    return [];
  }
}

export async function getTraded(userId: string) {
  // Check cache first
  const cached = tradedCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < TRADED_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await dataClient.get('/traded', {
      params: { user: userId }
    });
    
    // Cache the result
    tradedCache.set(userId, {
      data: response.data,
      timestamp: Date.now()
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching traded markets for user ${userId}:`, error.message);
    return { user: userId, traded: 0 };
  }
}

export async function searchUsers(query: string) {
  try {
    const response = await axios.get('/api/search', {
      params: { q: query }
    });

    // Only return profiles, filter out events and markets
    return {
      profiles: response.data.profiles || [],
      events: [],
      tags: []
    };
  } catch (error: any) {
    console.error(`Error searching users with query "${query}":`, error.message);
    return { events: [], profiles: [], tags: [] };
  }
}