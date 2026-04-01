import { polymarketAPI } from './polymarket'
import type { Position, ClosedPosition, NBAUserProfile, Tag } from './types/polymarket'

// Server-side pre-filter: passed as `title` param to Polymarket API
export const NBA_TITLE_FILTER = 'NBA'

// Client-side exclusion patterns for international basketball
const EXCLUDED_PATTERNS = [
  /euroleague/i,
  /eurobasket/i,
  /\bfiba\b/i,
  /\bbcl\b/i,
  /liga\s+endesa/i,
  /serie\s+a\s+basket/i,
  /\bbbl\b/i,
  /\bcba\b/i,
  /\bkbl\b/i,
  /\bnbl\b/i,
  /\bpba\b/i,
  /philippine/i,
  /turkish\s+basketball/i,
  /chinese\s+basketball/i,
]

export function isNBAMarket(title: string, tags?: Tag[], eventSlug?: string): boolean {
  if (!title) return false

  // Check exclusion patterns first
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(title)) return false
  }

  // Check if title contains NBA
  if (/\bNBA\b/.test(title)) return true

  // Check eventSlug starts with "nba-"
  if (eventSlug && /^nba-/i.test(eventSlug)) return true

  // Check tags for NBA
  if (tags?.some(tag => tag.slug?.toLowerCase() === 'nba')) return true

  return false
}

export function filterNBAItems<T extends { title: string; tags?: Tag[]; eventSlug?: string }>(items: T[]): T[] {
  return items.filter(item => isNBAMarket(item.title, item.tags, item.eventSlug))
}

function calculateWinRate(closedPositions: ClosedPosition[], openPositions: Position[]): number {
  const total = closedPositions.length + openPositions.length
  if (total === 0) return 0
  const closedWins = closedPositions.filter(pos => {
    const pnl = typeof pos.realizedPnl === 'number' ? pos.realizedPnl : parseFloat(String(pos.realizedPnl))
    return pnl > 0
  }).length
  const openWins = openPositions.filter(pos => {
    const pnl = typeof pos.cashPnl === 'number' ? pos.cashPnl : parseFloat(String(pos.cashPnl))
    return pnl > 0
  }).length
  return ((closedWins + openWins) / total) * 100
}

export async function getUserNBAProfile(userId: string, timePeriod?: string): Promise<NBAUserProfile | null> {
  try {
    // Fetch all data in parallel (no server-side title filter — Polymarket API
    // doesn't reliably support it, so we filter client-side with isNBAMarket)
    const [publicProfile, openPositions, closedPositions, tradedData] = await Promise.all([
      polymarketAPI.getPublicProfile(userId),
      polymarketAPI.getOpenPositions({ user: userId }, true),
      polymarketAPI.getClosedPositions({ user: userId }, timePeriod),
      polymarketAPI.getUserTradedMarkets(userId),
    ])

    if (!publicProfile) return null

    console.log(`[NBA] User ${userId}: ${openPositions.length} open, ${closedPositions.length} closed positions fetched`)
    if (openPositions.length > 0) {
      console.log(`[NBA] Sample open title: "${openPositions[0].title}", tags:`, openPositions[0].tags)
    }
    if (closedPositions.length > 0) {
      console.log(`[NBA] Sample closed title: "${closedPositions[0].title}", tags:`, closedPositions[0].tags)
    }

    // Apply client-side NBA filter to exclude international basketball
    const nbaOpenPositions = filterNBAItems(openPositions)
    const nbaClosedPositions = filterNBAItems(closedPositions)
    console.log(`[NBA] After filter: ${nbaOpenPositions.length} open, ${nbaClosedPositions.length} closed NBA positions`)

    // Calculate NBA-specific metrics (parse floats in case API returns strings)
    const toNum = (v: any) => (typeof v === 'number' ? v : parseFloat(v) || 0)

    // Closed positions don't have a size field — back-calculate shares from totalBought / avgPrice
    const closedShares = (p: ClosedPosition) => {
      const avg = toNum(p.avgPrice)
      return avg > 0 ? toNum(p.totalBought) / avg : 0
    }

    const nbaQuantity = nbaOpenPositions.reduce((sum, p) => sum + toNum(p.size), 0)
      + nbaClosedPositions.reduce((sum, p) => sum + closedShares(p), 0)

    const nbaVolume = nbaOpenPositions.reduce((sum, p) => sum + toNum(p.totalBought), 0)
      + nbaClosedPositions.reduce((sum, p) => sum + toNum(p.totalBought), 0)

    const nbaPnl = nbaOpenPositions.reduce((sum, p) => sum + toNum(p.cashPnl), 0)
      + nbaClosedPositions.reduce((sum, p) => sum + toNum(p.realizedPnl), 0)

    const nbaTradeCount = nbaOpenPositions.length + nbaClosedPositions.length

    const totalAmountTraded = nbaOpenPositions.reduce((sum, p) => sum + toNum(p.totalBought), 0)
      + nbaClosedPositions.reduce((sum, p) => sum + toNum(p.totalBought), 0)

    const amountClosed = nbaClosedPositions.reduce((sum, p) => sum + toNum(p.totalBought), 0)

    // Avg cost = total spent / total shares (weighted average entry price)
    const totalShares = nbaOpenPositions.reduce((sum, p) => sum + toNum(p.size), 0)
      + nbaClosedPositions.reduce((sum, p) => sum + closedShares(p), 0)
    const avgCost = totalShares > 0 ? totalAmountTraded / totalShares : 0

    const totalValue = nbaOpenPositions.reduce((sum, p) => sum + toNum(p.currentValue), 0)
      + nbaClosedPositions.reduce((sum, p) => sum + toNum(p.realizedPnl) + toNum(p.totalBought), 0)

    return {
      username: publicProfile.name || publicProfile.username || userId.slice(0, 8),
      pseudonym: publicProfile.pseudonym || publicProfile.username || '',
      profileImage: publicProfile.profileImage || publicProfile.pfp,
      joinedDate: publicProfile.createdAt || publicProfile.memberSince || '',
      proxyWallet: userId,

      totalMarketsTraded: tradedData.traded,
      totalQuantity: nbaQuantity,
      totalValue,
      totalVolume: nbaVolume,

      nbaTradeCount,
      nbaQuantity,
      nbaVolume,

      amountTraded: totalAmountTraded,
      amountClosed,
      avgCost,
      pnl: nbaPnl,

      nbaOpenPositions,
      nbaClosedPositions,
      nbaWinRate: calculateWinRate(nbaClosedPositions, nbaOpenPositions),
    }
  } catch (error: any) {
    console.error(`Error fetching NBA profile for user ${userId}:`, error.message)
    return null
  }
}
