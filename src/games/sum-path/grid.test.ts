import { describe, expect, it } from 'vitest'
import { puzzleFor, shapeFor, shortest, sumOf } from './grid'

// 3×3:  1 2 3 / 4 5 6 / 7 8 9
const g = { w: 3, h: 3, cells: [1, 2, 3, 4, 5, 6, 7, 8, 9] }

describe('shortest', () => {
  it('finds a straight path when one adds up', () => {
    expect(shortest(g, 1 + 2 + 3 + 6 + 9, 9)).toEqual([0, 1, 2, 5, 8])
  })
  it('goes the long way round when it has to', () => {
    // 1+4+5+2+3+6+9 = 30 is seven squares; no five-square path adds to 30.
    const way = shortest(g, 30, 9)!
    expect(way.length).toBe(7)
    expect(sumOf(g.cells, way)).toBe(30)
  })
  it('says when it can’t be done', () => {
    expect(shortest(g, 2, 9)).toBeNull()
  })
  it('keeps a prefix', () => {
    const way = shortest(g, 1 + 4 + 7 + 8 + 9, 9, [0, 3])!
    expect(way).toEqual([0, 3, 6, 7, 8])
  })
})

describe('daily puzzles', () => {
  it('two weeks of days: same for everyone, solvable at par, par in the day’s range', () => {
    for (let d = 1; d <= 14; d++) {
      const seed = `2027-02-${String(d).padStart(2, '0')}`
      const p = puzzleFor(seed)
      expect(puzzleFor(seed)).toEqual(p)
      expect(p.solution[0]).toBe(0)
      expect(p.solution[p.solution.length - 1]).toBe(p.w * p.h - 1)
      expect(new Set(p.solution).size).toBe(p.solution.length)
      expect(sumOf(p.cells, p.solution)).toBe(p.target)
      expect(p.par).toBe(p.solution.length)
      const { extra: [lo, hi] } = shapeFor(seed)
      expect(p.par - (2 * p.w - 1)).toBeGreaterThanOrEqual(lo)
      expect(p.par - (2 * p.w - 1)).toBeLessThanOrEqual(hi)
    }
  })
})
