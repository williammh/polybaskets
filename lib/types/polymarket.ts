// Polymarket API Types
export interface PolymarketUser {
  id: string
  username: string
  profileImage?: string
  volume?: number
  totalPositions?: number
  activePositions?: Position[]
  closedPositions?: ClosedPosition[]
  redeemedPositions?: number
  winRate?: number 
  marketsTraded?: number
  redeemedPositionRate?: number 
  pnl?: number
  predictions?: number
  createdAt: string
  updatedAt: string
}

// NBA User Profile - aggregated stats for the user profile page
export interface NBAUserProfile {
  // User Identity
  username: string
  pseudonym: string
  profileImage?: string
  joinedDate: string
  proxyWallet: string

  // Global Stats
  totalMarketsTraded: number
  totalQuantity: number
  totalValue: number
  totalVolume: number

  // NBA Specifics
  nbaTradeCount: number
  nbaQuantity: number
  nbaVolume: number

  // Financials
  amountTraded: number
  amountClosed: number
  avgCost: number
  pnl: number

  // Positions & Trades
  nbaOpenPositions: Position[]
  nbaClosedPositions: ClosedPosition[]
  nbaWinRate: number
}

// Open Position Types
export interface Position {
  timestamp: number
  proxyWallet: string // User Profile Address (0x-prefixed, 40 hex chars)
  asset: string
  conditionId: string // 0x-prefixed 64-hex string
  size: number
  avgPrice: number
  initialValue: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  totalBought: number
  realizedPnl: number
  percentRealizedPnl: number
  curPrice: number
  redeemable: boolean
  mergeable: boolean
  title: string
  slug: string
  icon: string
  eventSlug: string
  outcome: string
  outcomeIndex: number
  oppositeOutcome: string
  oppositeAsset: string
  endDate: string
  negativeRisk: boolean
  tags?: Tag[]
}

// Closed Position Types
export interface ClosedPosition {
  proxyWallet: string // User Profile Address (0x-prefixed, 40 hex chars)
  asset: string
  conditionId: string // 0x-prefixed 64-hex string
  avgPrice: number
  curPrice: number
  realizedPnl: number
  totalBought: number
  timestamp: number // int64 unix seconds
  title: string
  slug: string
  icon: string
  eventSlug: string
  outcome: string
  outcomeIndex: number
  oppositeOutcome: string
  oppositeAsset: string
  endDate: string
  tags?: Tag[]
}

export interface PositionsFilters {
  user?: string // User Profile Address (0x-prefixed, 40 hex chars) - required
  market?: string[] // conditionId(s) - csv separated
  eventId?: number[] // Event id(s) - csv separated
  sizeThreshold?: number // default: 1, >= 0
  redeemable?: boolean // default: false
  mergeable?: boolean // default: false
  limit?: number // default: 100, range: 0-500
  offset?: number // default: 0, range: 0-10000
  sortBy?: 'CURRENT' | 'INITIAL' | 'TOKENS' | 'CASHPNL' | 'PERCENTPNL' | 'TITLE' | 'RESOLVING' | 'PRICE' | 'AVGPRICE'
  sortDirection?: 'ASC' | 'DESC'
  title?: string // Maximum string length: 100
}

export interface ClosedPositionsFilters {
  user?: string // User Profile Address (0x-prefixed, 40 hex chars)
  market?: string[] // conditionId(s) - csv separated
  title?: string // Filter by market title (max 100 chars)
  eventId?: number[] // Event id(s) - csv separated
  limit?: number // default: 10, range: 0-50
  offset?: number // default: 0, range: 0-100000
  sortBy?: 'REALIZEDPNL' | 'TITLE' | 'PRICE' | 'AVGPRICE' | 'TIMESTAMP'
  sortDirection?: 'ASC' | 'DESC'
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: string
  proxyWallet: string // User Profile Address (0x-prefixed, 40 hex chars)
  userName: string
  vol: number
  pnl: number
  profileImage: string
  xUsername: string
  verifiedBadge: boolean
}

export interface LeaderboardFilters {
  category?: 'OVERALL' | 'POLITICS' | 'SPORTS' | 'CRYPTO' | 'CULTURE' | 'MENTIONS' | 'WEATHER' | 'ECONOMICS' | 'TECH' | 'FINANCE'
  timePeriod?: 'DAY' | 'WEEK' | 'MONTH' | 'ALL'
  orderBy?: 'PNL' | 'VOL'
  limit?: number 
  offset?: number // 0-1000, default 0
  user?: string 
  userName?: string
}

// Tag Types
export interface Tag {
  slug: string
  label?: string
}

// Trade Types
export interface Trade {
  proxyWallet: string // User Profile Address (0x-prefixed, 40 hex chars)
  side: 'BUY' | 'SELL'
  asset: string
  conditionId: string // 0x-prefixed 64-hex string
  size: number
  price: number
  timestamp: number // int64
  title: string
  slug: string
  icon: string
  eventSlug: string
  outcome: string
  outcomeIndex: number
  name: string
  pseudonym: string
  bio: string
  profileImage: string
  profileImageOptimized: string
  transactionHash: string
  tags?: Tag[]
}

export interface TradeFilters {
  limit?: number
  offset?: number
  takerOnly?: boolean
  filterType?: 'CASH' | 'TOKENS'
  filterAmount?: number 
  market?: string[]
  eventId?: number[]
  user?: string // User Profile Address (0x-prefixed, 40 hex chars)
  side?: 'BUY' | 'SELL'
}

export interface PolymarketEvent {
  id: string
  ticker: string | null
  slug: string | null
  title: string | null
  subtitle: string | null
  description: string | null
  resolutionSource: string | null
  startDate: string | null
  creationDate: string | null
  endDate: string | null
  image: string | null
  icon: string | null
  active: boolean | null
  closed: boolean | null
  archived: boolean | null
  new: boolean | null
  featured: boolean | null
  restricted: boolean | null
  liquidity: number | null
  volume: number | null
  openInterest: number | null
  sortBy: string | null
  category: string | null
  subcategory: string | null
  isTemplate: boolean | null
  templateVariables: string | null
  published_at: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string | null
  updatedAt: string | null
  commentsEnabled: boolean | null
  competitive: number | null
  volume24hr: number | null
  volume1wk: number | null
  volume1mo: number | null
  volume1yr: number | null
  featuredImage: string | null
  disqusThread: string | null
  parentEvent: string | null
  enableOrderBook: boolean | null
  liquidityAmm: number | null
  liquidityClob: number | null
  negRisk: boolean | null
  negRiskMarketID: string | null
  negRiskFeeBips: number | null
  commentCount: number | null
  imageOptimized: object | null
  iconOptimized: object | null
  featuredImageOptimized: object | null
  subEvents: string[] | null
  markets: object[] | null
  series: object[] | null
  categories: object[] | null
  collections: object[] | null
  tags: object[] | null
  cyom: boolean | null
  closedTime: string | null
  showAllOutcomes: boolean | null
  showMarketImages: boolean | null
  automaticallyResolved: boolean | null
  enableNegRisk: boolean | null
  automaticallyActive: boolean | null
  eventDate: string | null
  startTime: string | null
  eventWeek: number | null
  seriesSlug: string | null
  score: string | null
  elapsed: string | null
  period: string | null
  live: boolean | null
  ended: boolean | null
  finishedTimestamp: string | null
  gmpChartMode: string | null
  eventCreators: object[] | null
  tweetCount: number | null
  chats: object[] | null
  featuredOrder: number | null
  estimateValue: boolean | null
  cantEstimate: boolean | null
  estimatedValue: string | null
  templates: object[] | null
  spreadsMainLine: number | null
  totalsMainLine: number | null
  carouselMap: string | null
  pendingDeployment: boolean | null
  deploying: boolean | null
  deployingTimestamp: string | null
  scheduledDeploymentTimestamp: string | null
  gameStatus: string | null
}
