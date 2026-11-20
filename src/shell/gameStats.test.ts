import { describe, expect, it } from 'vitest'
import { compact, gameLine } from './gameStats'

describe('game numbers', () => {
  it('shortens big numbers', () => {
    expect([compact(87), compact(1234), compact(1000), compact(2_500_000)]).toEqual(['87', '1.2k', '1k', '2.5m'])
  })
  it('shows likes from 20 votes and plays from the threshold', () => {
    const s = { plays: { a: 1234, b: 40 }, likes: { a: { pct: 92, n: 31 }, b: { pct: 100, n: 3 } }, online: 0, onlineByGame: {} }
    expect(gameLine('a', s, 100)).toBe('92% liked · 1.2k plays')
    expect(gameLine('b', s, 100)).toBe('')
    expect(gameLine('c', s, 100)).toBe('')
  })
})
