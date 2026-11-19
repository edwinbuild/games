import { beforeEach, describe, expect, it } from 'vitest'
import { cardsFor } from './luckiest-person'
import { targetFor } from './blind-timer'
import { targetsFor } from './pitch-match'
import { coloursFor } from './color-recall'
import { getStats, recordDaily, recordPlay, todaysDailyText } from '../shell/stats'

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

describe('daily puzzles', () => {
  it('deals the same five different cards to everyone on a date', () => {
    for (let d = 1; d <= 60; d++) {
      const day = new Date(2027, 0, d)
      const cards = cardsFor(day)
      expect(cards).toEqual(cardsFor(day))
      expect(new Set(cards).size).toBe(5)
      for (const c of cards) expect(c).toBeGreaterThanOrEqual(1), expect(c).toBeLessThanOrEqual(100)
    }
    expect(cardsFor(new Date(2027, 0, 1))).not.toEqual(cardsFor(new Date(2027, 0, 2)))
  })

  it('keeps Blind Timer targets between 5 and 12 seconds', () => {
    for (let d = 1; d <= 60; d++) {
      const t = targetFor(new Date(2027, 0, d))
      expect(t).toBeGreaterThanOrEqual(5)
      expect(t).toBeLessThanOrEqual(12)
    }
  })

  it('keeps Pitch Match tones in the slider range', () => {
    for (let d = 1; d <= 30; d++) {
      for (const hz of targetsFor(new Date(2027, 0, d))) {
        expect(hz).toBeGreaterThan(200)
        expect(hz).toBeLessThan(1000)
      }
    }
  })
})

describe('result text for the home cards', () => {
  it('stores today\'s daily text and the best score text', () => {
    const now = new Date(2027, 0, 5, 12)
    recordDaily('t', 0.04, now, '0.04s')
    expect(todaysDailyText('t', now)).toBe('0.04s')
    recordPlay('r', 300, (a, b) => a < b, '300ms')
    recordPlay('r', 250, (a, b) => a < b, '250ms')
    recordPlay('r', 400, (a, b) => a < b, '400ms')
    expect(getStats('r').bestText).toBe('250ms')
  })
})

describe('per-try puzzles', () => {
  it('gives each Color Recall try its own colours, the same for everyone', () => {
    const d = new Date(2027, 2, 4)
    expect(coloursFor(d, 1)).toEqual(coloursFor(d, 1))
    expect(coloursFor(d, 1)).not.toEqual(coloursFor(d, 0))
    expect(coloursFor(d, 0)).toEqual(coloursFor(d))
  })
})
