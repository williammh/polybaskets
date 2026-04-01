import axios, { AxiosInstance } from "axios"
import {
  PolymarketUser,
  ClosedPosition,
  ClosedPositionsFilters,
  Position,
  PositionsFilters,
  LeaderboardEntry,
  LeaderboardFilters,
  Trade,
  TradeFilters,
  PolymarketEvent,
} from "./types/polymarket"
import {
  getOrSetCached,
  getUserTradesCacheKey,
  getUserClosedPositionsCacheKey,
  getEventCacheKey,
  getMarketCacheKey,
  getLeaderboardCacheKey,
  CACHE_TTL,
} from "./cache"

class PolymarketAPI {



  private client: AxiosInstance
  private dataClient: AxiosInstance

  constructor() {
    // gamma-api.polymarket.com client
    this.client = axios.create({
      baseURL: "https://gamma-api.polymarket.com",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    })

    // Separate client for data-api.polymarket.com endpoints
    this.dataClient = axios.create({
      baseURL: "https://data-api.polymarket.com",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    })
  }

  /**
   * Fetch all open and closed positions for a user and calculate winRate
   */
  async getAllPositions(userId: string, timePeriod?: string, maxPages?: number): Promise<{ openPositions: Position[]; closedPositions: ClosedPosition[]; winRate: number }> {
    let openPositions: Position[] = []
    let closedPositions: ClosedPosition[] = []
    try {
      openPositions = await this.getOpenPositions({ user: userId })
    } catch (e) {
      console.error(`Error fetching open positions for user ${userId}:`, e)
    }
    try {
      closedPositions = await this.getClosedPositions({ user: userId, sortBy: "TIMESTAMP" }, timePeriod, maxPages)
    } catch (e) {
      console.error(`Error fetching closed positions for user ${userId}:`, e)
    }

    let winRate = 0
    if (closedPositions.length > 0) {
      const wins = closedPositions.filter((pos: any) => (typeof pos.realizedPnl === 'number' ? pos.realizedPnl : (pos.realizedPnl ? parseFloat(pos.realizedPnl) : 0)) > 0).length
      winRate = (wins / closedPositions.length) * 100
    }
    return { openPositions, closedPositions, winRate }
  }

  /**
   * Fetch leaderboard data
   * @param filters - Query parameters for filtering leaderboard
   * @param maxPages - Maximum number of pages to fetch
   * @param offset - Offset for pagination
   * @returns Array of leaderboard entries
   */
  async getLeaderboard(filters?: LeaderboardFilters, maxPages: number = 1, offset: number = 0): Promise<PolymarketUser[]> {
    const cacheKey = getLeaderboardCacheKey(filters, maxPages, offset)
    return getOrSetCached(cacheKey, async () => {
      try {
        // If user or userName is specified, this is a single user lookup - don't paginate
        const isSingleUserLookup = !!(filters?.user || filters?.userName)

        const queryParams: Record<string, any> = {
          category: filters?.category ?? 'OVERALL',
          timePeriod: filters?.timePeriod ?? 'ALL',
          orderBy: filters?.orderBy ?? 'PNL',
          limit: isSingleUserLookup ? (1) : 20,
        }

        if (filters?.user) {
          queryParams.user = filters.user
        }
        if (filters?.userName) {
          queryParams.userName = filters.userName
        }

        // For single user lookups, just fetch one page
        if (isSingleUserLookup) {
          console.log('Fetching single user with params:', queryParams)

          // https://docs.polymarket.com/api-reference/core/get-trader-leaderboard-rankings
          const response = await this.dataClient.get<LeaderboardEntry[]>('/v1/leaderboard', {
            params: queryParams,
          })

          const entries = Array.isArray(response.data) ? response.data : []
          console.log(`✅ Single user lookup: ${entries.length} users found`)

          if (entries.length === 0) {
            return []
          }

          const user = entries[0]
          const userId = user.proxyWallet;
          const openPositions = await this.getOpenPositions({ user: userId })
          const tradedData = await this.getUserTradedMarkets(userId)

          const winRate = 0
          const { vol, userName, ...rest } = user;

          return [{
            ...rest,
            id: userId,
            username: userName,
            volume: vol,
            activePositions: openPositions,
            marketsTraded: tradedData.traded,
            winRate,
            createdAt: new Date().toISOString(), // Default timestamp for leaderboard users
            updatedAt: new Date().toISOString(), // Default timestamp for leaderboard users
          }]
        }

        // For leaderboard (multiple users), paginate to get specified number of pages
        const allLeaderboardEntries: LeaderboardEntry[] = []
        let currentOffset = offset

        for (let page = 0; page < maxPages; page++) {
          const params = { ...queryParams, offset: currentOffset }

          console.log(`Fetching leaderboard page ${page + 1}/${maxPages} with params:`, params)

          const response = await this.dataClient.get<LeaderboardEntry[]>('/v1/leaderboard', {
            params,
          })

          const entries = Array.isArray(response.data) ? response.data : []
          console.log(`✅ Leaderboard page ${page + 1}: ${entries.length} traders fetched`)

          allLeaderboardEntries.push(...entries)

          // If we got less than 20 entries, we've reached the end
          if (entries.length < 20) {
            break
          }

          currentOffset += 20
        }

        console.log(`Total leaderboard entries fetched: ${allLeaderboardEntries.length}`)

        const leaderboardUsersWithPositions: PolymarketUser[] = await Promise.all(
          allLeaderboardEntries.map(async (user: any) => {
            const userId = user.proxyWallet;
            const openPositions = await this.getOpenPositions({ user: userId })
            const tradedData = await this.getUserTradedMarkets(userId)
            const winRate = 0
            const { vol, userName, ...rest } = user;

            console.log(`${userName}/${userId} openPositions: ${openPositions.length} tradedMarkets: ${tradedData.traded}`)

            return {
              ...rest,
              id: userId,
              username: userName,
              volume: vol,
              activePositions: openPositions,
              marketsTraded: tradedData.traded,
              winRate,
              createdAt: new Date().toISOString(), // Default timestamp for leaderboard users
              updatedAt: new Date().toISOString(), // Default timestamp for leaderboard users
            }
          })
        )

        return leaderboardUsersWithPositions
      } catch (error: any) {
        console.error('Error fetching leaderboard:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        })
        return []
      }
    }, CACHE_TTL.LEADERBOARD)
  }

  /**
   * Fetch a single user by ID
   * @param userId - User wallet address
   * @returns User data or null if not found
   */
  async getUser(userId: string): Promise<PolymarketUser | null> {
    try {
      const users = await this.getLeaderboard({ user: userId, limit: 1 })
      return users.length > 0 ? users[0] : null
    } catch (error: any) {
      console.error(`Error fetching user ${userId}:`, error.message)
      return null
    }
  }

  /**
   * Fetch closed positions with optional filters
   * NOTE: The 'user' parameter is REQUIRED by the API
   * @param filters - Query parameters for filtering closed positions
   * @returns Array of closed positions (up to 1000)
   */
  async getClosedPositions(filters?: ClosedPositionsFilters, timePeriod?: string, maxPages: number = 1000): Promise<ClosedPosition[]> {
    if (!filters?.user) {
      console.log('No user specified for closed-positions endpoint - returning empty array')
      return []
    }

    const cacheFilters = { ...filters, maxPages, timePeriod }
    const cacheKey = getUserClosedPositionsCacheKey(filters.user, cacheFilters)


    // "2025-12-01T00:00:00Z"


    return getOrSetCached(
      cacheKey,
      async () => {
        try {
          const baseParams: Record<string, any> = {
            user: filters!.user,
            limit: 50,
            sortBy: filters?.sortBy ?? "TIMESTAMP",
            sortDirection: filters?.sortDirection ?? "DESC",
            market: (filters?.market && filters.market.length > 0) ? filters.market.join(',') : undefined,
            title: filters?.title ? filters.title.substring(0, 100) : undefined,
            eventId: (filters?.eventId && filters.eventId.length > 0) ? filters.eventId.join(',') : undefined,
          }

          // Calculate cutoff date once outside the loop
          let cutoffDate: Date | null = null
          if (timePeriod === 'MONTH' || timePeriod === 'WEEK' || timePeriod === 'DAY') {
            const days = timePeriod === 'MONTH' ? 30 : timePeriod === 'WEEK' ? 7 : 1
            cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }

          let allClosedPositions: ClosedPosition[] = []
          let offset = filters?.offset ?? 0

          for (let page = 0; page < maxPages; page++) {
            const params = { ...baseParams, offset }

            // 'Full URL:', `{this.dataClient.defaults.baseURL}/closed-positions
            // `Fetching closed positions page {page + 1}/{maxPages} with params

            const response = await this.dataClient.get('/closed-positions', {
              params,
            })

            const positions = Array.isArray(response.data) ? response.data : []
            // Closed positions page {page + 1}: $positions.length} positions fetched

            // Check if we should terminate early based on timePeriod
            if (cutoffDate && positions.length > 0) {
              const oldestPositionDate = new Date(positions[positions.length - 1].endDate)
              if (oldestPositionDate < cutoffDate) {
                // Filter positions that are within the time period before adding
                const filteredPositions = positions.filter(pos => new Date(pos.endDate) >= cutoffDate!)
                allClosedPositions.push(...filteredPositions)
                break // Stop fetching more pages
              }
            }

            allClosedPositions.push(...positions)

            // If we got less than 50 positions, we've reached the end
            if (positions.length < 50) {
              break
            }

            offset += 50
          }

          // Filter positions based on timePeriod (only if we didn't filter during fetching)
          if (cutoffDate) {
            allClosedPositions = allClosedPositions.filter(pos => new Date(pos.endDate) >= cutoffDate!)
          }

          console.log(`Total closed positions fetched for user ${filters!.user}: ${allClosedPositions.length}`);

          // Enrich positions with event tags
          const enrichedPositions = await Promise.all(allClosedPositions.map(async (position: any) => {
            const enrichedPosition = { ...position }

            // Fetch event tags if eventSlug exists
            if (position.eventSlug) {
              try {
                const event = await this.getEventBySlug(position.eventSlug)
                if (event && event.tags) {
                  enrichedPosition.tags = event.tags
                }
              } catch (error) {
                console.error(`Error fetching event tags for ${position.eventSlug}:`, error)
              }
            }

            return enrichedPosition
          }))

          return enrichedPositions;
        } catch (error: any) {
          console.error('Error fetching closed positions:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            params: error.config?.params,
          })
          // Return empty array instead of throwing to prevent search from failing
          return []
        }
      },
      CACHE_TTL.USER_DATA
    )
  }


  /**
   * Fetch user activity to calculate redeemed percentage and win rate
   * @param userId - User wallet address
   * @param timePeriod - Time period to filter activity
   * @returns Object with total positions, redeemed count, redeemed rate, and win rate
   */
  async getUserActivity(userId: string, timePeriod?: string): Promise<{ totalPositions: number; redeemedCount: number; redeemedRate: number; winRate: number }> {
    try {
      // Calculate time range based on timePeriod
      const now = Math.floor(Date.now() / 1000)
      let start: number | undefined
      
      switch (timePeriod) {
        case 'DAY':
          start = now - (24 * 60 * 60)
          break
        case 'WEEK':
          start = now - (7 * 24 * 60 * 60)
          break
        case 'MONTH':
          start = now - (30 * 24 * 60 * 60)
          break
        case 'ALL':
        default:
          start = undefined // No time filter for ALL
          break
      }

      const params: Record<string, any> = {
        user: userId,
        limit: 500, // Max allowed
        offset: 0,
      }

      if (start) {
        params.start = start
        params.end = now
      }

      // Fetch all activity
      const allActivityResponse = await this.dataClient.get('/activity', { params })
      const allActivity = Array.isArray(allActivityResponse.data) ? allActivityResponse.data : []

      // Track positions by conditionId (market)
      const positionsByMarket = new Map<string, { buys: any[], redeems: any[] }>()
      
      allActivity.forEach((activity: any) => {
        const conditionId = activity.conditionId
        if (!conditionId) return

        if (!positionsByMarket.has(conditionId)) {
          positionsByMarket.set(conditionId, { buys: [], redeems: [] })
        }

        const position = positionsByMarket.get(conditionId)!
        
        if (activity.type === 'TRADE' && activity.side === 'BUY') {
          position.buys.push(activity)
        } else if (activity.type === 'REDEEM') {
          position.redeems.push(activity)
        }
      })

      // Calculate metrics
      let totalPositions = 0
      let redeemedCount = 0
      let wins = 0
      let losses = 0

      positionsByMarket.forEach((position, conditionId) => {
        if (position.buys.length === 0) return
        
        totalPositions += position.buys.length

        // If position was redeemed, calculate P/L
        if (position.redeems.length > 0) {
          redeemedCount += position.redeems.length
          
          // Calculate total buy cost and redeem value
          const buyTotal = position.buys.reduce((sum, buy) => sum + (buy.usdcSize || 0), 0)
          const redeemTotal = position.redeems.reduce((sum, redeem) => sum + (redeem.usdcSize || 0), 0)
          
          // If we got more back than we put in, it's a win
          if (redeemTotal > buyTotal) {
            wins++
          } else if (redeemTotal < buyTotal) {
            losses++
          }
        }
      })

      const redeemedRate = totalPositions > 0 ? (redeemedCount / totalPositions) * 100 : 0
      const closedPositions = wins + losses
      const winRate = closedPositions > 0 ? (wins / closedPositions) * 100 : 0

      return { totalPositions, redeemedCount, redeemedRate, winRate }
    } catch (error: any) {
      console.error(`Error fetching activity for user ${userId}:`, error.message)
      return { totalPositions: 0, redeemedCount: 0, redeemedRate: 0, winRate: 0 }
    }
  }

  /**
   * Get event by slug
   * @param slug - Event slug
   * @param includeChat - Whether to include chat data
   * @param includeTemplate - Whether to include template data
   * @returns Event data
   */
  async getEventBySlug(slug: string, includeChat?: boolean, includeTemplate?: boolean): Promise<PolymarketEvent | null> {
    const cacheKey = getEventCacheKey(slug, includeChat, includeTemplate)

    return getOrSetCached(
      cacheKey,
      async () => {
        try {
          const params: Record<string, any> = {}

          if (includeChat !== undefined) {
            params.include_chat = includeChat
          }

          if (includeTemplate !== undefined) {
            params.include_template = includeTemplate
          }

          const response = await this.client.get(`/events/slug/${slug}`, { params })

          return response.data
        } catch (error: any) {
          console.error(`Error fetching event by slug ${slug}:`, error.message)
          return null
        }
      },
      CACHE_TTL.USER_DATA
    )
  }

  /**
   * Get market by slug
   * @param slug - Market slug
   * @param includeTag - Whether to include tag data
   * @returns Market data
   */
  async getMarketBySlug(slug: string, includeTag?: boolean): Promise<any | null> {
    const cacheKey = getMarketCacheKey(slug, includeTag)

    return getOrSetCached(
      cacheKey,
      async () => {
        try {
          const params: Record<string, any> = {}

          if (includeTag !== undefined) {
            params.include_tag = includeTag
          }

          const response = await this.client.get(`/markets/slug/${slug}`, { params })

          return response.data
        } catch (error: any) {
          console.error(`Error fetching market by slug ${slug}:`, error.message)
          return null
        }
      },
      CACHE_TTL.USER_DATA
    )
  }

  /**
   * Get total markets a user has traded
   * @param userId - User Profile Address (0x-prefixed, 40 hex chars)
   * @returns Object with user address and traded count
   */
  async getUserTradedMarkets(userId: string): Promise<{ user: string; traded: number }> {
    try {
      const response = await this.dataClient.get('/traded', {
        params: { user: userId }
      })

      return {
        user: response.data.user,
        traded: response.data.traded
      }
    } catch (error: any) {
      console.error(`Error fetching traded markets for user ${userId}:`, error.message)
      return { user: userId, traded: 0 }
    }
  }


  /**
   * Fetch user trades
   * @param userId - User Profile Address (0x-prefixed, 40 hex chars)
   * @param filters - Optional filters for trades
   * @returns Array of user trades
   */
  async getUserTrades(userId: string, filters: TradeFilters = {}): Promise<Trade[]> {
    const cacheKey = getUserTradesCacheKey(userId, filters)

    return getOrSetCached(
      cacheKey,
      async () => {
        try {
          const params: Record<string, any> = {
            user: userId,
            limit: filters.limit || 100,
            offset: filters.offset || 0,
            takerOnly: filters.takerOnly !== undefined ? filters.takerOnly : true,
            ...filters,
          }

          // Remove undefined values
          Object.keys(params).forEach(key => {
            if (params[key] === undefined) {
              delete params[key]
            }
          })

          const response = await this.dataClient.get('/trades', { params })

          if (!Array.isArray(response.data)) {
            console.warn('Unexpected trades response format:', response.data)
            return []
          }

          // Enrich trades with event tags
          const enrichedTrades = await Promise.all(response.data.map(async (trade: any) => {
            const enrichedTrade = { ...trade }

            // Fetch event tags if eventSlug exists
            if (trade.eventSlug) {
              try {
                const event = await this.getEventBySlug(trade.eventSlug)
                if (event && event.tags) {
                  enrichedTrade.tags = event.tags
                }
              } catch (error) {
                console.error(`Error fetching event tags for ${trade.eventSlug}:`, error)
              }
            }

            return enrichedTrade
          }))

          return enrichedTrades.map((trade: any) => ({
            proxyWallet: trade.proxyWallet,
            side: trade.side,
            asset: trade.asset,
            conditionId: trade.conditionId,
            size: trade.size,
            price: trade.price,
            timestamp: trade.timestamp,
            title: trade.title,
            slug: trade.slug,
            icon: trade.icon,
            eventSlug: trade.eventSlug,
            outcome: trade.outcome,
            outcomeIndex: trade.outcomeIndex,
            name: trade.name,
            pseudonym: trade.pseudonym,
            bio: trade.bio,
            profileImage: trade.profileImage,
            profileImageOptimized: trade.profileImageOptimized,
            transactionHash: trade.transactionHash,
            tags: trade.tags,
          }))
        } catch (error: any) {
          console.error(`Error fetching trades for user ${userId}:`, error.message)
          return []
        }
      },
      CACHE_TTL.USER_DATA
    )
  }

  /**
   * Fetch user positions (open positions)
   * @param filters - Query parameters for filtering positions
   * @returns Array of user positions
   */
  async getOpenPositions(filters: PositionsFilters, getTags: boolean = false): Promise<Position[]> {
    try {
      if (!filters.user) {
        throw new Error('User parameter is required for positions')
      }

      const params: Record<string, any> = {
        user: filters.user,
        sizeThreshold: filters.sizeThreshold ?? 1,
        limit: filters.limit ?? 500,
        offset: filters.offset ?? 0,
      }

      if (filters.market && filters.market.length > 0) {
        params.market = filters.market.join(',')
      }

      if (filters.eventId && filters.eventId.length > 0) {
        params.eventId = filters.eventId.join(',')
      }

      if (filters.sortBy && ['CURRENT', 'INITIAL', 'TOKENS', 'CASHPNL', 'PERCENTPNL', 'TITLE', 'RESOLVING', 'PRICE', 'AVGPRICE'].includes(filters.sortBy)) {
        params.sortBy = filters.sortBy
      }

      if (filters.sortDirection && ['ASC', 'DESC'].includes(filters.sortDirection)) {
        params.sortDirection = filters.sortDirection
      }

      if (filters.title) {
        params.title = filters.title
      }

      const response = await this.dataClient.get('/positions', { params })

      if (!Array.isArray(response.data)) {
        console.warn('Unexpected positions response format:', response.data)
        return []
      }

      // Enrich positions with event tags
      const positions = await Promise.all(response.data.map(async (position: any) => {
        const enrichedPosition = {
          proxyWallet: position.proxyWallet,
          asset: position.asset,
          conditionId: position.conditionId,
          // timestamp expected as seconds since epoch in many downstream consumers
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
        }

        // Fetch event tags if getTags is true
        if (getTags) {
          try {
            const event = await this.getEventBySlug(position.eventSlug)
            if (event && event.tags) {
              (enrichedPosition as any).tags = event.tags
            }
          } catch (error) {
            console.error(`Error fetching event tags for ${position.eventSlug}:`, error)
          }
        }

        return enrichedPosition
      }))

      return positions
    } catch (error: any) {
      console.error('Error fetching positions:', error.message)
      return []
    }
  }

  /**
   * Get public profile by wallet address
   * @param address - The wallet address (proxy wallet or user address)
   * @returns Public profile information
   */
  async getPublicProfile(address: string): Promise<any> {
    try {
      const response = await this.client.get('/public-profile', {
        params: { address }
      })
      return response.data
    } catch (error: any) {
      console.error(`Error fetching public profile for address ${address}:`, error.message)
      return null
    }
  }
}

// Export singleton instance
export const polymarketAPI = new PolymarketAPI()
