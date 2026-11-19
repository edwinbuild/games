import { describe, expect, it } from 'vitest'
import { freeSlots, level, LOW_PEGS, MASSES, PEGS, PER_MASS, puzzleFor, solve, tiltFor, torques, trayLeft, twoBeams, type Weight } from './beam'

const w = (beam: 'top' | 'low', pos: number, mass: number): Weight => ({ beam, pos, mass })
const day = (i: number) => { const d = new Date(2027, 0, 1 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

describe('Balance Beam', () => {
  it('adds up torque as mass times distance, with the hanging beam pulling at its peg', () => {
    expect(torques([w('top', -3, 2), w('top', 2, 3)], null)).toEqual({ top: 0, low: 0 })
    // Hanging at +2: the low beam's 1 + 2 = 3 weight pulls 6 on the top beam; low beam: -1·2 + 2·1 = 0.
    expect(torques([w('low', -1, 2), w('low', 2, 1)], 2)).toEqual({ top: 6, low: 0 })
    expect(level([w('low', -1, 2), w('low', 2, 1), w('top', -3, 2)], 2)).toBe(true)
    expect(tiltFor(0)).toBe(0)
    expect(tiltFor(100)).toBe(16)
    expect(tiltFor(-2)).toBeLessThan(0)
  })
  it('finds the fewest weights, using free pegs only and at most two of each size', () => {
    const fixed = [w('top', 5, 5), w('top', -5, 1)] // torque 20
    const s = solve({ fixed, hangAt: null })!
    expect(level([...fixed, ...s.weights], null)).toBe(true)
    for (const x of s.weights) expect([5, -5]).not.toContain(x.pos)
    expect(new Set(s.weights.map((x) => x.pos)).size).toBe(s.weights.length)
    for (const m of MASSES) expect(s.weights.filter((x) => x.mass === m).length).toBeLessThanOrEqual(PER_MASS)
    expect(trayLeft([w('top', 1, 3), w('top', 2, 3)])).toEqual([2, 2, 0, 2, 2])
  })
  it('never offers the peg the second beam hangs from', () => {
    const slots = freeSlots({ fixed: [], hangAt: 3 })
    expect(slots.some((s) => s.beam === 'top' && s.pos === 3)).toBe(false)
    expect(slots.filter((s) => s.beam === 'low')).toHaveLength(LOW_PEGS.length)
  })
  it('has two beams Thursday to Sunday', () => {
    expect(twoBeams('2027-01-04')).toBe(false) // Monday
    expect(twoBeams('2027-01-07')).toBe(true) // Thursday
    expect(twoBeams('2027-01-10')).toBe(true) // Sunday
  })
  it('makes every day start tipped and need three or four weights, the same for everyone', () => {
    let four = 0
    for (let i = 0; i < 70; i++) {
      const seed = day(i)
      const p = puzzleFor(seed)
      expect(p).toEqual(puzzleFor(seed))
      expect(level(p.fixed, p.hangAt)).toBe(false)
      expect([3, 4]).toContain(p.par)
      expect(solve(p)!.count).toBe(p.par)
      expect(p.hangAt == null).toBe(!twoBeams(seed))
      for (const x of p.fixed) expect(x.beam === 'top' ? PEGS : LOW_PEGS).toContain(x.pos)
      if (p.par === 4) four++
    }
    expect(four).toBeGreaterThan(3)
  })
})
