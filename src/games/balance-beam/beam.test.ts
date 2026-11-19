import { describe, expect, it } from 'vitest'
import { PEGS, puzzleFor, solve, tiltFor, torque } from './beam'

describe('Balance Beam', () => {
  it('adds up torque as mass times distance', () => {
    expect(torque([{ pos: -3, mass: 2 }, { pos: 2, mass: 3 }])).toBe(0)
    expect(torque([{ pos: 5, mass: 1 }])).toBe(5)
    expect(tiltFor(0)).toBe(0)
    expect(tiltFor(100)).toBe(16)
    expect(tiltFor(-2)).toBeLessThan(0)
  })
  it('finds the fewest weights that level the beam, using free pegs only', () => {
    expect(solve([{ pos: 4, mass: 3 }])).toMatchObject({ count: 1 }) // 3 at 4 → e.g. 3 at -4
    const s = solve([{ pos: 5, mass: 4 }, { pos: -5, mass: 1 }])! // torque 15: one weight can't (max 3×5 at -5, taken)
    expect(s.count).toBe(2)
    expect(torque([{ pos: 5, mass: 4 }, { pos: -5, mass: 1 }, ...s.weights])).toBe(0)
    for (const w of s.weights) expect([5, -5]).not.toContain(w.pos)
    expect(new Set(s.weights.map((w) => w.pos)).size).toBe(s.weights.length)
  })
  it('makes a daily beam that starts tilted and needs two or three weights, the same for everyone', () => {
    for (let d = 1; d <= 120; d++) {
      const p = puzzleFor(`2027-03-${d}`)
      expect(p).toEqual(puzzleFor(`2027-03-${d}`))
      expect(torque(p.fixed)).not.toBe(0)
      expect([2, 3]).toContain(p.par)
      expect(solve(p.fixed)!.count).toBe(p.par)
      for (const w of p.fixed) expect(PEGS).toContain(w.pos)
    }
  })
  it('mixes easier and harder days: about a quarter need three weights', () => {
    let three = 0
    for (let i = 0; i < 365; i++) if (puzzleFor(`day${i}`).par === 3) three++
    expect(three / 365).toBeGreaterThan(0.15)
    expect(three / 365).toBeLessThan(0.4)
  })
})
