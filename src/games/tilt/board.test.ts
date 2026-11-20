import { describe, expect, it } from 'vitest'
import { puzzleFor, shapeFor, solve, tilt, type Board } from './board'

// 4×4, no blocks: marble 0 at (0,0) with its hole at (3,0); marble 1 at (2,0) with its hole at (0,3).
const b: Board = { w: 4, h: 4, blocks: [], holes: [3, 12] }

describe('tilt', () => {
  it('slides marbles until something stops them, nearest the side first', () => {
    const { state } = tilt({ ...b, holes: [15, 14] }, [0, 2], 'right')
    expect(state).toEqual([2, 3])
  })
  it('drops a marble into its own hole, and rolls over another marble’s hole', () => {
    const { state } = tilt(b, [0, 5], 'right')
    expect(state).toEqual([-1, 7])
    // Marble 1 rolls over hole 0 (at 3) without dropping.
    expect(tilt(b, [-1, 1], 'right').state).toEqual([-1, 3])
  })
  it('stops at blocks and the edge', () => {
    expect(tilt({ ...b, blocks: [2] }, [0, 15], 'right').state).toEqual([1, 15])
    expect(tilt(b, [0, 15], 'up').state).toEqual([0, 3])
  })
  it('finds the fewest tilts', () => {
    const way = solve(b, [0, 5])!
    let s = [0, 5]
    for (const d of way) s = tilt(b, s, d).state
    expect(s).toEqual([-1, -1])
    expect(way.length).toBe(3) // right (marble 0 drops), down, left
  })
})

describe('daily puzzles', () => {
  it('every day of two weeks can be solved, at par, within its range, and is the same for everyone', () => {
    for (let d = 1; d <= 14; d++) {
      const seed = `2027-01-${String(d).padStart(2, '0')}`
      const p = puzzleFor(seed)
      expect(puzzleFor(seed)).toEqual(p)
      let s = p.start
      for (const dir of p.solution) s = tilt(p, s, dir).state
      expect(s.every((x) => x < 0)).toBe(true)
      expect(solve(p, p.start)!.length).toBe(p.par)
      const [lo, hi] = shapeFor(seed).par
      expect(p.par).toBeGreaterThanOrEqual(lo)
      expect(p.par).toBeLessThanOrEqual(hi)
    }
  })
})
