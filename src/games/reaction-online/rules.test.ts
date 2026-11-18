import { describe, expect, it } from 'vitest'
import { makeDelays, roundWinner } from './rules'

describe('online reaction duel', () => {
  it('the faster reaction wins; an early tap loses; both early is nobody', () => {
    expect(roundWinner(240, 260)).toBe(0)
    expect(roundWinner(300, 210)).toBe(1)
    expect(roundWinner(null, 400)).toBe(1)
    expect(roundWinner(250, null)).toBe(0)
    expect(roundWinner(null, null)).toBe(-1)
    expect(roundWinner(250, 250)).toBe(-1)
  })
  it('delays stay between 1.5 and 4 seconds', () => {
    for (const d of makeDelays(Math.random, 50)) expect(d).toBeGreaterThanOrEqual(1500), expect(d).toBeLessThanOrEqual(4000)
  })
})
