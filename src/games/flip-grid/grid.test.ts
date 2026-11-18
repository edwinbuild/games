import { describe, expect, it } from 'vitest'
import { flip, N, puzzleFor, shortestSolution, solved } from './grid'

describe('Flip Grid', () => {
  it('flips a tile and its neighbours, clipped at the edges', () => {
    const g = flip(Array(N * N).fill(false), 0)
    expect(g.filter(Boolean).length).toBe(3)
    expect(flip(Array(N * N).fill(false), 12).filter(Boolean).length).toBe(5)
  })
  it('every daily puzzle for a year is solvable, and its par solution really clears it', () => {
    for (let d = 1; d <= 365; d++) {
      const seed = `2027-day-${d}`
      const g = puzzleFor(seed)
      expect(solved(g)).toBe(false)
      const sol = shortestSolution(g)!
      expect(sol).not.toBeNull()
      expect(sol.length).toBeLessThanOrEqual(10)
      expect(solved(sol.reduce(flip, g))).toBe(true)
    }
  })
  it('gives the same puzzle for the same seed', () => {
    expect(puzzleFor('a')).toEqual(puzzleFor('a'))
  })
})
