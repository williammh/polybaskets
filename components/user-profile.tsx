"use client"

import { useState, useEffect, useMemo, memo, useCallback } from "react"
import { NBAUserProfile, ClosedPosition, Position } from "@/lib/types/polymarket"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserSkeleton } from "@/components/user-skeleton"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Search, CalendarIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface UserProfileProps {
  userId: string
}

// Safe numeric coercion (API may return null/string)
function n(value: any): number {
  return typeof value === 'number' ? value : parseFloat(value) || 0
}

function fmtCurrency(value: any): string {
  const v = n(value)
  return '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPnl(value: any): string {
  const v = n(value)
  const prefix = v > 0 ? '+' : v < 0 ? '-' : ''
  return prefix + fmtCurrency(v)
}

function fmtDate(value: string | number | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'number'
    ? new Date(value * 1000)
    : new Date(value)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

type SortState = { field: string; dir: 'ASC' | 'DESC' }

function compareValues(a: any, b: any, field: string): number {
  const get = (item: any) => {
    if (field === 'cost_closed') return n(item.avgPrice) * n(item.totalBought)
    if (field === 'value_closed') return n(item.avgPrice) * n(item.totalBought) + n(item.realizedPnl)
    if (field === 'cost_open') return n(item.avgPrice) * n(item.size)
    const v = item?.[field]
    if (v === undefined || v === null) return null
    if (typeof v === 'number') return v
    const dt = Date.parse(String(v))
    if (!isNaN(dt)) return dt
    return String(v).toLowerCase()
  }
  const av = get(a)
  const bv = get(b)
  if (av === null && bv === null) return 0
  if (av === null) return -1
  if (bv === null) return 1
  if (typeof av === 'number' && typeof bv === 'number') return av - bv
  if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv)
  return 0
}

type CombinedRow = {
  conditionId: string
  title: string
  outcome: string
  qty: number
  avgPrice: number
  cost: number
  pnl: number
  value: number
  endDate: string | number | undefined
  status: 'Active' | 'Closed'
}

function toCombinedRow(pos: ClosedPosition | Position, status: 'Active' | 'Closed'): CombinedRow {
  if (status === 'Closed') {
    const p = pos as ClosedPosition
    const qty = n(p.totalBought)
    const avg = n(p.avgPrice)
    const cost = avg * qty
    const pnl = n(p.realizedPnl)
    return { conditionId: p.conditionId, title: p.title, outcome: p.outcome, qty, avgPrice: avg, cost, pnl, value: cost + pnl, endDate: p.endDate, status }
  } else {
    const p = pos as Position
    const qty = n(p.size)
    const avg = n(p.avgPrice)
    const cost = avg * qty
    const pnl = n(p.cashPnl)
    return { conditionId: p.conditionId, title: p.title, outcome: p.outcome, qty, avgPrice: avg, cost, pnl, value: n(p.currentValue), endDate: p.endDate, status }
  }
}

const AllPositionRow = memo(function AllPositionRow({ row }: { row: CombinedRow }) {
  return (
    <TableRow>
      <TableCell className="truncate" title={row.title}>{row.title}</TableCell>
      <TableCell className="truncate">{row.outcome}</TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{row.qty.toFixed(1)}</TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{fmtCurrency(row.avgPrice)}</TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{fmtCurrency(row.cost)}</TableCell>
      <TableCell className={`text-right font-mono whitespace-nowrap ${row.pnl > 0 ? 'text-green-400' : row.pnl < 0 ? 'text-red-400' : ''}`}>
        {fmtPnl(row.pnl)}
      </TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{fmtCurrency(row.value)}</TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(row.endDate)}</TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{row.status}</TableCell>
    </TableRow>
  )
})

const ClosedPositionRow = memo(function ClosedPositionRow({ pos }: { pos: ClosedPosition }) {
  const pnl = n(pos.realizedPnl)
  return (
    <TableRow>
      <TableCell className="truncate" title={pos.title}>{pos.title}</TableCell>
      <TableCell className="truncate">{pos.outcome}</TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{n(pos.totalBought).toFixed(1)}</TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{fmtCurrency(pos.avgPrice)}</TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{fmtCurrency(n(pos.avgPrice) * n(pos.totalBought))}</TableCell>
      <TableCell className={`text-right font-mono whitespace-nowrap ${pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : ''}`}>
        {fmtPnl(pnl)}
      </TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{fmtCurrency(n(pos.avgPrice) * n(pos.totalBought) + n(pos.realizedPnl))}</TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(pos.endDate)}</TableCell>
      <TableCell />
    </TableRow>
  )
})

const OpenPositionRow = memo(function OpenPositionRow({ pos }: { pos: Position }) {
  const pnl = n(pos.cashPnl)
  return (
    <TableRow>
      <TableCell className="truncate" title={pos.title}>{pos.title}</TableCell>
      <TableCell className="truncate">{pos.outcome}</TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{n(pos.size).toFixed(1)}</TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{fmtCurrency(pos.avgPrice)}</TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{fmtCurrency(n(pos.avgPrice) * n(pos.size))}</TableCell>
      <TableCell className={`text-right font-mono whitespace-nowrap ${pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : ''}`}>
        {fmtPnl(pnl)}
      </TableCell>
      <TableCell className="text-right font-mono whitespace-nowrap">{fmtCurrency(pos.currentValue)}</TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(pos.endDate)}</TableCell>
      <TableCell />
    </TableRow>
  )
})

export function UserProfile({ userId }: UserProfileProps) {
  const [profile, setProfile] = useState<NBAUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'closed' | 'open'>('all')
  const [searchFilter, setSearchFilter] = useState("")
  const [page, setPage] = useState(1)
  const PER_PAGE = 50

  type BetType = 'moneyline' | 'overunder' | 'spread'
  const ALL_BET_TYPES: BetType[] = ['moneyline', 'overunder', 'spread']
  const [betTypeFilter, setBetTypeFilter] = useState<Set<BetType>>(new Set(ALL_BET_TYPES))
  const [maxCloseDate, setMaxCloseDate] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)

  const [sortAll, setSortAll] = useState<SortState>({ field: 'pnl', dir: 'DESC' })
  const [sortClosed, setSortClosed] = useState<SortState>({ field: 'realizedPnl', dir: 'DESC' })
  const [sortOpen, setSortOpen] = useState<SortState>({ field: 'currentValue', dir: 'DESC' })
  const sort = tab === 'all' ? sortAll : tab === 'closed' ? sortClosed : sortOpen

  const handleSort = useCallback((field: string) => {
    const setter = tab === 'all' ? setSortAll : tab === 'closed' ? setSortClosed : setSortOpen
    setter(prev => prev.field === field
      ? { field, dir: prev.dir === 'ASC' ? 'DESC' : 'ASC' }
      : { field, dir: 'DESC' }
    )
  }, [tab])

  const SortIcon = ({ field }: { field: string }) => {
    if (sort.field !== field) return <ArrowUpDown className="inline-block ml-1 h-3 w-3 opacity-40" />
    return sort.dir === 'ASC'
      ? <ArrowUp className="inline-block ml-1 h-3 w-3" />
      : <ArrowDown className="inline-block ml-1 h-3 w-3" />
  }

  const Th = ({ field, label, tip, className }: { field: string; label: string; tip: string; className?: string }) => (
    <TableHead className={`cursor-pointer whitespace-nowrap ${className ?? ''}`}>
      <ClickTooltip tip={tip} className="font-mono text-xs">
        <span className="inline-flex items-center gap-0.5" onClick={() => handleSort(field)}>{label}<SortIcon field={field} /></span>
      </ClickTooltip>
    </TableHead>
  )

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetch(`/api/users/${userId}/nba-profile`)
      .then(res => res.ok ? res.json() : null)
      .then((data: NBAUserProfile | null) => {
        if (cancelled) return
        setProfile(data)
        setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  // Reset sort defaults when switching tabs
  const handleTabChange = useCallback((next: 'all' | 'closed' | 'open') => {
    setTab(next)
    setSearchFilter("")
    setBetTypeFilter(new Set(ALL_BET_TYPES))
    setMaxCloseDate("")
    setPage(1)
  }, [])

  // Compute maxMs once per maxCloseDate change instead of per-position
  const maxMs = useMemo(() => {
    if (!maxCloseDate) return null
    return new Date(maxCloseDate + 'T23:59:59').getTime()
  }, [maxCloseDate])

  const matchesDateFilter = useCallback((endDate: string | number | undefined): boolean => {
    if (maxMs === null) return true
    if (!endDate) return true
    const endMs = typeof endDate === 'number' ? endDate * 1000 : Date.parse(String(endDate))
    if (isNaN(endMs)) return true
    return endMs >= maxMs
  }, [maxMs])

  const matchesBetType = useCallback((title: string) => {
    if (betTypeFilter.size === ALL_BET_TYPES.length) return true
    const isOverUnder = title.includes(': O/U')
    const isSpread = title.includes('Spread:')
    const isMoneyline = !isOverUnder && !isSpread
    if (betTypeFilter.has('overunder') && isOverUnder) return true
    if (betTypeFilter.has('spread') && isSpread) return true
    if (betTypeFilter.has('moneyline') && isMoneyline) return true
    return false
  }, [betTypeFilter])

  // Transform raw positions once per profile change; reused by both memos below
  const allRows = useMemo(() => {
    const closed = (profile?.nbaClosedPositions ?? []).map(p => toCombinedRow(p, 'Closed'))
    const open = (profile?.nbaOpenPositions ?? []).map(p => toCombinedRow(p, 'Active'))
    return { closed, open, all: [...closed, ...open] }
  }, [profile])

  const filteredStats = useMemo(() => {
    const closed = allRows.closed.filter(r => matchesBetType(r.title) && matchesDateFilter(r.endDate))
    const open = allRows.open.filter(r => matchesBetType(r.title) && matchesDateFilter(r.endDate))
    const all = [...closed, ...open]
    const winners = all.filter(r => r.pnl > 0).length
    const cost = all.reduce((s, r) => s + r.cost, 0)
    const pnl = all.reduce((s, r) => s + r.pnl, 0)
    return {
      count: all.length,
      closedCount: closed.length,
      openCount: open.length,
      winRate: all.length > 0 ? (winners / all.length) * 100 : 0,
      cost,
      pnl,
      value: cost + pnl,
    }
  }, [allRows, matchesBetType, matchesDateFilter])

  const filteredRows = useMemo(() => {
    const q = searchFilter.trim().toLowerCase()
    if (tab === 'all') {
      const all = allRows.all

      const filtered = all.filter(r => (!q || r.title.toLowerCase().includes(q)) && matchesBetType(r.title) && matchesDateFilter(r.endDate))
      return [...filtered].sort((a, b) => {
        const av = (a as any)[sort.field] ?? null
        const bv = (b as any)[sort.field] ?? null
        if (av === null && bv === null) return 0
        if (av === null) return -1
        if (bv === null) return 1
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return sort.dir === 'ASC' ? cmp : -cmp
      })
    }
    const positions = tab === 'closed'
      ? allRows.closed
      : allRows.open
    const filtered = (positions as CombinedRow[]).filter((p) => (!q || p.title.toLowerCase().includes(q)) && matchesBetType(p.title) && matchesDateFilter(p.endDate))
    return [...filtered].sort((a: any, b: any) => {
      const cmp = compareValues(a, b, sort.field)
      return sort.dir === 'ASC' ? cmp : -cmp
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, tab, sort, searchFilter, betTypeFilter, maxCloseDate])

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filteredRows.slice(start, start + PER_PAGE)
  }, [filteredRows, page])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PER_PAGE))

  useEffect(() => { setPage(1) }, [searchFilter, betTypeFilter, maxCloseDate])

  if (isLoading || !profile) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
        <UserSkeleton />
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 overflow-hidden">
      <div className="flex flex-col gap-4 sm:gap-6">

        {/* User Identity */}
        <div className="flex items-start gap-4 sm:gap-6">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
            <AvatarImage src={profile.profileImage} className="object-cover" />
            <AvatarFallback className="text-lg">
              {profile.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link
              href={`https://polymarket.com/profile/${profile.proxyWallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:underline"
            >
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{profile.username}</h1>
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
            </Link>
          
            <p className="text-xs text-muted-foreground font-mono truncate">{profile.proxyWallet}</p>
            {profile.joinedDate && (
              <p className="text-xs text-muted-foreground">
                Joined {new Date(profile.joinedDate).toLocaleDateString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {n(profile.totalMarketsTraded).toLocaleString()} predictions
            </p>
          </div>
        </div>

        {/* Stats */}
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap gap-4">
            <StatCard label={<StatLabel text="NBA Predictions" tip="Includes open and closed positions" />} value={filteredStats.count.toLocaleString()} highlight />
            <StatCard label={<StatLabel text="Total NBA Win %" tip="Positions with positive P/L, across open and closed" />} value={`${filteredStats.winRate.toFixed(1)}%`} highlight />
            <StatCard label={<StatLabel text="Total NBA Cost" tip="Total amount spent, across open and closed positions" />} value={fmtCurrency(filteredStats.cost)} highlight />
            <StatCard
              label={<StatLabel text="Total NBA P/L" tip="Realized P/L (closed) + unrealized P/L (open)" />}
              value={fmtPnl(filteredStats.pnl)}
              highlight
              className={filteredStats.pnl > 0 ? 'text-green-400' : filteredStats.pnl < 0 ? 'text-red-400' : ''}
            />
            <StatCard label={<StatLabel text="Total NBA Value" tip="Cost + P/L across open and closed positions" />} value={fmtCurrency(filteredStats.value)} highlight />
          </div>
        </TooltipProvider>

        {/* Bet Type Filter + Date Filter */}
        <div className="flex items-center gap-4 flex-wrap">
          {(['moneyline', 'overunder', 'spread'] as const).map((type) => {
            const labels: Record<typeof type, string> = { moneyline: 'Moneyline', overunder: 'Over/Under', spread: 'Spread' }
            return (
              <div key={type} className="flex items-center gap-1.5">
                <Checkbox
                  id={`bet-type-${type}`}
                  checked={betTypeFilter.has(type)}
                  onCheckedChange={() => {
                    setBetTypeFilter(prev => {
                      const next = new Set(prev)
                      next.has(type) ? next.delete(type) : next.add(type)
                      return next
                    })
                    setPage(1)
                  }}
                />
                <Label htmlFor={`bet-type-${type}`} className="cursor-pointer text-sm font-normal">
                  {labels[type]}
                </Label>
              </div>
            )
          })}
          <div className="flex items-center gap-1.5 ml-auto">
            {maxCloseDate && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setMaxCloseDate(""); setPage(1) }}>
                Clear
              </Button>
            )}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-44 text-sm font-normal justify-start">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0 mr-1.5" />
                  {maxCloseDate
                    ? new Date(maxCloseDate + 'T12:00:00').toLocaleDateString()
                    : <span className="text-muted-foreground">Max Close Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={maxCloseDate ? new Date(maxCloseDate + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear()
                      const m = String(date.getMonth() + 1).padStart(2, '0')
                      const d = String(date.getDate()).padStart(2, '0')
                      setMaxCloseDate(`${y}-${m}-${d}`)
                    } else {
                      setMaxCloseDate("")
                    }
                    setPage(1)
                    setCalendarOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Tab + Search row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-md border overflow-hidden text-sm">
            <button
              className={`px-3 py-1.5 transition-colors ${tab === 'all' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}
              onClick={() => handleTabChange('all')}
            >
              All
              <span className="ml-1.5 text-xs opacity-60">({filteredStats.count})</span>
            </button>
            <button
              className={`px-3 py-1.5 transition-colors border-l ${tab === 'closed' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}
              onClick={() => handleTabChange('closed')}
            >
              Closed
              <span className="ml-1.5 text-xs opacity-60">({filteredStats.closedCount})</span>
            </button>
            <button
              className={`px-3 py-1.5 transition-colors border-l ${tab === 'open' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}
              onClick={() => handleTabChange('open')}
            >
              Active
              <span className="ml-1.5 text-xs opacity-60">({filteredStats.openCount})</span>
            </button>
          </div>
          {searchFilter ? (
            <span className="text-sm text-muted-foreground">({filteredRows.length})</span>
          ) : null}
          <div className="relative flex-1 min-w-[180px] max-w-xs sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filter by market name..."
              className="pl-9 h-8 text-sm"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Positions Table */}
        {paginated.length > 0 ? (
          <>
            <div className="border rounded-md overflow-x-auto">
              <TooltipProvider delayDuration={200}>
                <Table className="table-fixed w-full min-w-[700px]">
                  <colgroup>
                    <col className="w-[200px]" />
                    <col className="w-[90px]" />
                    <col className="w-[60px]" />
                    <col className="w-[65px]" />
                    <col className="w-[80px]" />
                    <col className="w-[80px]" />
                    <col className="w-[80px]" />
                    <col className="w-[90px]" />
                    <col className="w-[70px]" />
                  </colgroup>
                  <TableHeader className="bg-white dark:bg-gray-950">
                    <TableRow>
                      {tab === 'all' ? (
                        <>
                          <Th field="title" label="Market" tip="title" />
                          <Th field="outcome" label="Outcome" tip="outcome" />
                          <Th field="qty" label="Qty" tip="totalBought or size" className="text-right" />
                          <Th field="avgPrice" label="Avg" tip="avgPrice" className="text-right" />
                          <Th field="cost" label="Cost" tip="avgPrice × qty" className="text-right" />
                          <Th field="pnl" label="P/L" tip="realizedPnl or cashPnl" className="text-right" />
                          <Th field="value" label="Value" tip="cost + pnl" className="text-right" />
                          <Th field="endDate" label="Close Date" tip="endDate" />
                          <Th field="status" label="Status" tip="Active or Closed" />
                        </>
                      ) : tab === 'closed' ? (
                        <>
                          <Th field="title" label="Market" tip="title" />
                          <Th field="outcome" label="Outcome" tip="outcome" />
                          <Th field="totalBought" label="Qty" tip="totalBought" className="text-right" />
                          <Th field="avgPrice" label="Avg" tip="avgPrice" className="text-right" />
                          <Th field="cost_closed" label="Cost" tip="avgPrice × totalBought" className="text-right" />
                          <Th field="realizedPnl" label="P/L" tip="realizedPnl" className="text-right" />
                          <Th field="value_closed" label="Value" tip="(avgPrice × totalBought) + realizedPnl" className="text-right" />
                          <Th field="endDate" label="Close Date" tip="endDate" />
                          <TableHead />
                        </>
                      ) : (
                        <>
                          <Th field="title" label="Market" tip="title" />
                          <Th field="outcome" label="Outcome" tip="outcome" />
                          <Th field="size" label="Qty" tip="size" className="text-right" />
                          <Th field="avgPrice" label="Avg" tip="avgPrice" className="text-right" />
                          <Th field="cost_open" label="Cost" tip="avgPrice × size" className="text-right" />
                          <Th field="cashPnl" label="P/L" tip="cashPnl" className="text-right" />
                          <Th field="currentValue" label="Value" tip="currentValue" className="text-right" />
                          <Th field="endDate" label="Close Date" tip="endDate" />
                          <TableHead />
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(paginated as CombinedRow[]).map((row, i) => (
                      <AllPositionRow key={`${row.conditionId}-${i}`} row={row} />
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{filteredRows.length} positions</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <span className="text-muted-foreground">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-32 flex items-center justify-center border rounded-md">
            <p className="text-muted-foreground">
              {searchFilter
                ? 'No matching positions'
                : tab === 'all' ? 'No NBA positions' : tab === 'closed' ? 'No closed NBA positions' : 'No active NBA positions'}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

function ClickTooltip({ tip, children, side, className }: {
  tip: string
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild onClick={() => setOpen(o => !o)}>
        {children as React.ReactElement}
      </TooltipTrigger>
      <TooltipContent side={side ?? "top"} className={className}>{tip}</TooltipContent>
    </Tooltip>
  )
}

function StatLabel({ text, tip }: { text: string; tip: string }) {
  return (
    <ClickTooltip tip={tip} className="text-xs max-w-[200px]">
      <span className="cursor-default underline decoration-dotted underline-offset-2">{text}</span>
    </ClickTooltip>
  )
}

function StatCard({ label, value, highlight, className }: {
  label: React.ReactNode
  value: string
  highlight?: boolean
  className?: string
}) {
  return (
    <div className={`p-3 rounded-md border flex-1 min-w-[140px] ${highlight ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold font-mono ${className || ''}`}>{value}</p>
    </div>
  )
}
