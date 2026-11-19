import { describe, expect, it } from 'vitest'
import { questionFor, rarity, WRITTEN_COUNT, YEAR } from './questions'

describe('Odd Pick questions', () => {
  it('has at least 120 hand-written questions and 365 in the year, none repeated', () => {
    expect(WRITTEN_COUNT).toBeGreaterThanOrEqual(120)
    expect(YEAR.length).toBe(365)
    const keys = new Set(YEAR.map((q) => q.prompt + '|' + [...q.options].sort().join(',')))
    expect(keys.size).toBe(365)
    for (const q of YEAR) {
      expect(q.options.length).toBe(5)
      expect(new Set(q.options).size).toBe(5)
    }
  })
  it('gives a different question every day for a year', () => {
    const ids = new Set<number>()
    for (let d = 0; d < 365; d++) ids.add(questionFor(new Date(2027, 0, 1 + d)).id)
    expect(ids.size).toBe(365)
  })
  it('ranks picks from rarest, sharing ties', () => {
    expect(rarity([40, 10, 30, 10, 10], 1)).toEqual({ rank: 1, share: 10, total: 100 })
    expect(rarity([40, 10, 30, 10, 10], 2)).toEqual({ rank: 4, share: 30, total: 100 })
    expect(rarity([0, 0, 0, 0, 0], 0).share).toBe(0)
  })
})
