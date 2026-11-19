import { beforeEach, describe, expect, it } from 'vitest'
import { countPlay, getStats, loadToday, recordDaily, recordPlay, saveToday, takeNewBest, todaysDaily, todaysDailyText } from './stats'

beforeEach(() => {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  }
})

describe('stats', () => {
  it('flags a new best once, never on the first result', () => {
    recordPlay('nb', 5)
    expect(takeNewBest('nb')).toBe(false)
    recordPlay('nb', 7)
    expect(takeNewBest('nb')).toBe(true)
    expect(takeNewBest('nb')).toBe(false)
    recordPlay('nb', 6)
    expect(takeNewBest('nb')).toBe(false)
  })

  it('flags a daily best against earlier days, in either direction', () => {
    recordDaily('nd', 80, new Date(2027, 0, 1))
    expect(takeNewBest('nd')).toBe(false)
    recordDaily('nd', 70, new Date(2027, 0, 2))
    expect(takeNewBest('nd')).toBe(false)
    recordDaily('nd', 90, new Date(2027, 0, 2))
    expect(takeNewBest('nd')).toBe(true)
    recordDaily('nl', 0.2, new Date(2027, 0, 1), undefined, true)
    recordDaily('nl', 0.05, new Date(2027, 0, 2), undefined, true)
    expect(takeNewBest('nl')).toBe(true)
  })

  it('keeps the best score in the right direction', () => {
    recordPlay('t', 300, (a, b) => a < b)
    recordPlay('t', 250, (a, b) => a < b)
    recordPlay('t', 400, (a, b) => a < b)
    expect(getStats('t')).toMatchObject({ plays: 3, best: 250 })
  })

  it('builds and breaks daily streaks', () => {
    recordDaily('d', 1, new Date(2027, 0, 1, 9))
    recordDaily('d', 2, new Date(2027, 0, 2, 9))
    recordDaily('d', 3, new Date(2027, 0, 2, 20)) // same day: no double count
    expect(getStats('d')).toMatchObject({ streak: 2, maxStreak: 2 })
    recordDaily('d', 4, new Date(2027, 0, 5, 9)) // missed days
    expect(getStats('d')).toMatchObject({ streak: 1, maxStreak: 2 })
  })

  it('counts a day played without a score towards the streak, but never as a best', () => {
    const d1 = new Date(2027, 0, 1), d2 = new Date(2027, 0, 2), d3 = new Date(2027, 0, 3)
    recordDaily('sp', null, d1, 'Spilled', true)
    expect(todaysDaily('sp', d1)).toBeNull()
    expect(todaysDailyText('sp', d1)).toBe('Spilled')
    expect(getStats('sp')).toMatchObject({ streak: 1 })
    // The next day's real score is not a "new best" over a spill.
    recordDaily('sp', 12, d2, '12% off', true)
    expect(takeNewBest('sp')).toBe(false)
    expect(getStats('sp')).toMatchObject({ streak: 2 })
    // A later spill on a day with a score keeps the score.
    recordDaily('sp', 8, d3, '8% off', true)
    recordDaily('sp', null, d3, 'Spilled', true)
    expect(todaysDaily('sp', d3)).toBe(8)
    expect(todaysDailyText('sp', d3)).toBe('8% off')
    expect(takeNewBest('sp')).toBe(true)
  })

  it('carries streaks across month and year ends, and breaks on a skipped day', () => {
    recordDaily('m', 1, new Date(2027, 0, 31, 23, 59))
    recordDaily('m', 1, new Date(2027, 1, 1, 0, 1))
    recordDaily('m', 1, new Date(2027, 1, 2))
    expect(getStats('m')).toMatchObject({ streak: 3, maxStreak: 3 })
    recordDaily('y2', 1, new Date(2027, 11, 31, 22))
    recordDaily('y2', 1, new Date(2028, 0, 1, 8))
    expect(getStats('y2').streak).toBe(2)
    recordDaily('y2', 1, new Date(2028, 0, 3))
    expect(getStats('y2')).toMatchObject({ streak: 1, maxStreak: 2 })
  })

  it('counts matches without touching the best', () => {
    countPlay('duel')
    countPlay('duel')
    expect(getStats('duel')).toMatchObject({ plays: 2, best: null })
    expect(takeNewBest('duel')).toBe(false)
  })

  it('resets per-day state at midnight', () => {
    saveToday('x', [1, 2], new Date(2027, 0, 1, 10))
    expect(loadToday('x', [], new Date(2027, 0, 1, 23))).toEqual([1, 2])
    expect(loadToday('x', [], new Date(2027, 0, 2, 0, 1))).toEqual([])
  })

  it('survives storage that throws', () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    } as unknown as Storage
    expect(() => recordPlay('y', 1)).not.toThrow()
    expect(getStats('y').plays).toBe(0)
  })
})
