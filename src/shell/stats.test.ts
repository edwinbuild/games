import { beforeEach, describe, expect, it } from 'vitest'
import { getStats, loadToday, recordDaily, recordPlay, saveToday } from './stats'

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
