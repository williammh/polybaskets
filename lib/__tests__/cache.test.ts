import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCached, setCached, getOrSetCached, clearCache } from '../cache'

beforeEach(() => {
  clearCache()
})

describe('getCached / setCached', () => {
  it('returns null for missing key', () => {
    expect(getCached('missing')).toBeNull()
  })

  it('returns cached data within TTL', () => {
    setCached('key1', { value: 42 }, 60_000)
    expect(getCached('key1')).toEqual({ value: 42 })
  })

  it('returns null after TTL expires', () => {
    vi.useFakeTimers()
    setCached('key2', 'hello', 1000)
    expect(getCached('key2')).toBe('hello')

    vi.advanceTimersByTime(1500)
    expect(getCached('key2')).toBeNull()

    vi.useRealTimers()
  })

  it('clearCache removes all entries', () => {
    setCached('a', 1, 60_000)
    setCached('b', 2, 60_000)
    expect(getCached('a')).toBe(1)

    clearCache()
    expect(getCached('a')).toBeNull()
    expect(getCached('b')).toBeNull()
  })
})

describe('getOrSetCached', () => {
  it('calls fetcher on cache miss', async () => {
    const fetcher = vi.fn().mockResolvedValue('fetched')
    const result = await getOrSetCached('key', fetcher, 60_000)
    expect(result).toBe('fetched')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('returns cached value on cache hit without calling fetcher', async () => {
    setCached('key', 'cached', 60_000)
    const fetcher = vi.fn().mockResolvedValue('fetched')
    const result = await getOrSetCached('key', fetcher, 60_000)
    expect(result).toBe('cached')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('calls fetcher after TTL expires', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn().mockResolvedValue('new-data')

    setCached('key', 'old-data', 1000)
    vi.advanceTimersByTime(1500)

    const result = await getOrSetCached('key', fetcher, 1000)
    expect(result).toBe('new-data')
    expect(fetcher).toHaveBeenCalledOnce()

    vi.useRealTimers()
  })
})
