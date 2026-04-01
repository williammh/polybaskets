import { describe, it, expect } from 'vitest'
import { isNBAMarket, filterNBAItems } from '../nba'
import type { ClosedPosition } from '../types/polymarket'

describe('isNBAMarket', () => {
  it('returns true for titles containing NBA', () => {
    expect(isNBAMarket('NBA Championship Winner')).toBe(true)
    expect(isNBAMarket('Will the NBA Finals go to 7 games?')).toBe(true)
    expect(isNBAMarket('NBA MVP 2025-26')).toBe(true)
  })

  it('returns false for non-NBA titles', () => {
    expect(isNBAMarket('NFL Super Bowl Winner')).toBe(false)
    expect(isNBAMarket('Bitcoin price above 100k')).toBe(false)
    expect(isNBAMarket('Presidential Election 2028')).toBe(false)
  })

  it('returns false for international basketball (exclusion patterns)', () => {
    expect(isNBAMarket('EuroLeague Basketball Final')).toBe(false)
    expect(isNBAMarket('FIBA World Cup Winner')).toBe(false)
    expect(isNBAMarket('EuroBasket Championship')).toBe(false)
    expect(isNBAMarket('BCL Champions League Basketball')).toBe(false)
    expect(isNBAMarket('Liga Endesa Champion')).toBe(false)
    expect(isNBAMarket('NBL Australia Winner')).toBe(false)
    expect(isNBAMarket('PBA Philippine Cup')).toBe(false)
    expect(isNBAMarket('CBA Chinese Basketball')).toBe(false)
    expect(isNBAMarket('KBL Korean Basketball')).toBe(false)
  })

  it('returns true when tags include nba', () => {
    expect(isNBAMarket('Some basketball game', [{ slug: 'nba' }])).toBe(true)
    expect(isNBAMarket('Some basketball game', [{ slug: 'NBA', label: 'NBA' }])).toBe(true) // slug match is case-insensitive
    expect(isNBAMarket('Some basketball game', [{ slug: 'nfl' }])).toBe(false)
  })

  it('returns true when eventSlug starts with nba-', () => {
    // Game titles like "Nuggets vs. Celtics" have no "NBA" in the title
    expect(isNBAMarket('Nuggets vs. Celtics', [], 'nba-den-bos-2026-01-07')).toBe(true)
    expect(isNBAMarket('Lakers vs. Warriors', [], 'nba-lal-gsw-2026-03-15')).toBe(true)
  })

  it('returns false when eventSlug does not start with nba-', () => {
    expect(isNBAMarket('Some game', [], 'nfl-kc-sf-2026-02-09')).toBe(false)
    expect(isNBAMarket('Some game', [], 'soccer-man-city-2026')).toBe(false)
  })

  it('eventSlug check is case-insensitive', () => {
    expect(isNBAMarket('Nuggets vs. Celtics', [], 'NBA-den-bos-2026-01-07')).toBe(true)
  })

  it('returns false for empty title', () => {
    expect(isNBAMarket('')).toBe(false)
  })

  it('exclusion patterns take priority over NBA in title', () => {
    expect(isNBAMarket('NBA vs EuroLeague exhibition')).toBe(false)
  })

  it('exclusion patterns take priority over eventSlug', () => {
    expect(isNBAMarket('EuroLeague Final', [], 'nba-something')).toBe(false)
  })
})

describe('filterNBAItems', () => {
  it('filters an array to only NBA items', () => {
    const items = [
      { title: 'NBA Finals MVP', tags: [] },
      { title: 'NFL Draft Pick 1', tags: [] },
      { title: 'NBA Championship', tags: [] },
      { title: 'Bitcoin $200k', tags: [] },
      { title: 'EuroLeague Final', tags: [] },
    ]

    const result = filterNBAItems(items)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('NBA Finals MVP')
    expect(result[1].title).toBe('NBA Championship')
  })

  it('includes items matched by eventSlug', () => {
    const items = [
      { title: 'Nuggets vs. Celtics', tags: [], eventSlug: 'nba-den-bos-2026-01-07' },
      { title: 'NFL Playoffs', tags: [], eventSlug: 'nfl-kc-sf-2026' },
      { title: 'Lakers vs. Warriors', tags: [], eventSlug: 'nba-lal-gsw-2026-03-15' },
    ]

    const result = filterNBAItems(items)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Nuggets vs. Celtics')
    expect(result[1].title).toBe('Lakers vs. Warriors')
  })

  it('includes items matched by tags', () => {
    const items = [
      { title: 'Some game tonight', tags: [{ slug: 'nba' }] },
      { title: 'Another game', tags: [{ slug: 'nfl' }] },
    ]
    const result = filterNBAItems(items)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Some game tonight')
  })

  it('returns empty array when no NBA items', () => {
    const items = [
      { title: 'NFL Winner', tags: [] },
      { title: 'Presidential Race', tags: [] },
    ]
    expect(filterNBAItems(items)).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    expect(filterNBAItems([])).toHaveLength(0)
  })
})

describe('win rate calculation (open + closed)', () => {
  // Mirrors the calculateWinRate logic in nba.ts which now combines both
  function calcWinRate(
    closed: { realizedPnl: number }[],
    open: { cashPnl: number }[]
  ): number {
    const total = closed.length + open.length
    if (total === 0) return 0
    const closedWins = closed.filter(p => p.realizedPnl > 0).length
    const openWins = open.filter(p => p.cashPnl > 0).length
    return ((closedWins + openWins) / total) * 100
  }

  it('returns 0 when no positions', () => {
    expect(calcWinRate([], [])).toBe(0)
  })

  it('counts only closed positions when no open positions', () => {
    const closed = [{ realizedPnl: 10 }, { realizedPnl: -5 }, { realizedPnl: 20 }, { realizedPnl: 0 }]
    expect(calcWinRate(closed, [])).toBe(50)
  })

  it('counts only open positions when no closed positions', () => {
    const open = [{ cashPnl: 5 }, { cashPnl: -2 }, { cashPnl: 8 }]
    // 2 wins out of 3
    expect(calcWinRate([], open)).toBeCloseTo(66.67, 1)
  })

  it('combines open and closed positions for win rate', () => {
    const closed = [{ realizedPnl: 10 }, { realizedPnl: -5 }] // 1 win
    const open = [{ cashPnl: 3 }, { cashPnl: -1 }]             // 1 win
    // 2 wins out of 4 total = 50%
    expect(calcWinRate(closed, open)).toBe(50)
  })

  it('treats zero pnl as a loss', () => {
    const closed = [{ realizedPnl: 0 }]
    const open = [{ cashPnl: 0 }]
    expect(calcWinRate(closed, open)).toBe(0)
  })

  it('handles all wins across both types', () => {
    const closed = [{ realizedPnl: 10 }, { realizedPnl: 5 }]
    const open = [{ cashPnl: 3 }, { cashPnl: 1 }]
    expect(calcWinRate(closed, open)).toBe(100)
  })

  it('handles all losses across both types', () => {
    const closed = [{ realizedPnl: -10 }]
    const open = [{ cashPnl: -3 }]
    expect(calcWinRate(closed, open)).toBe(0)
  })
})

describe('P/L and volume calculations', () => {
  it('calculates total P/L from closed positions', () => {
    const positions = [
      { realizedPnl: 10.5 },
      { realizedPnl: -3.2 },
      { realizedPnl: 7.1 },
    ]
    const totalPnl = positions.reduce((sum, p) => sum + p.realizedPnl, 0)
    expect(totalPnl).toBeCloseTo(14.4)
  })

  it('calculates total P/L combining open cashPnl and closed realizedPnl', () => {
    const closed = [{ realizedPnl: 10 }, { realizedPnl: -3 }]
    const open = [{ cashPnl: 5 }, { cashPnl: -1 }]
    const total = closed.reduce((s, p) => s + p.realizedPnl, 0)
      + open.reduce((s, p) => s + p.cashPnl, 0)
    expect(total).toBe(11)
  })

  it('calculates cost as avgPrice × size for open positions', () => {
    const positions = [
      { avgPrice: 0.5, size: 10 },
      { avgPrice: 0.7, size: 20 },
    ]
    const totalCost = positions.reduce((s, p) => s + p.avgPrice * p.size, 0)
    expect(totalCost).toBeCloseTo(19)
  })

  it('calculates cost as avgPrice × totalBought for closed positions', () => {
    const positions = [
      { avgPrice: 0.6, totalBought: 15 },
      { avgPrice: 0.4, totalBought: 25 },
    ]
    const totalCost = positions.reduce((s, p) => s + p.avgPrice * p.totalBought, 0)
    expect(totalCost).toBeCloseTo(19)
  })

  it('calculates NBA volume from positions', () => {
    const positions = [
      { totalBought: 100 },
      { totalBought: 200 },
      { totalBought: 50 },
    ]
    const volume = positions.reduce((sum, p) => sum + p.totalBought, 0)
    expect(volume).toBe(350)
  })
})
