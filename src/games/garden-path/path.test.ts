import { describe, expect, it } from 'vitest'
import { adjacent, check, countSolutions, puzzleFor, sizeFor, turnsAt } from './path'

const day = (i: number) => { const d = new Date(2027, 0, 4 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

describe('Garden Path', () => {
  it('knows neighbours and turns', () => {
    expect(adjacent(3, 3, 4).sort()).toEqual([1, 3, 5, 7])
    expect(adjacent(3, 3, 0).sort()).toEqual([1, 3])
    expect(turnsAt(3, 0, 1, 2)).toBe(false) // straight along the top
    expect(turnsAt(3, 0, 1, 4)).toBe(true)
  })
  it('checks a path: every square once, start to finish, stones obeyed', () => {
    // 2×2: 0 1 / 2 3, path 0 → 1 → 3 → 2 turns at 1 and 3.
    const p = { w: 2, h: 2, start: 0, end: 2, stones: { 1: 'turn' as const } }
    expect(check(p, [0, 1, 3, 2]).ok).toBe(true)
    expect(check(p, [0, 1, 3]).ok).toBe(false) // missed a square
    expect(check({ ...p, stones: { 1: 'straight' } }, [0, 1, 3, 2]).broken).toEqual([1])
  })
  it('gets bigger later in the week', () => {
    expect(sizeFor('2027-01-04')).toEqual([5, 5])
    expect(sizeFor('2027-01-10')).toEqual([6, 6])
  })
  it('makes every day solvable in exactly one way, with its own answer passing the check', () => {
    for (let i = 0; i < 21; i++) {
      const p = puzzleFor(day(i))
      expect(p).toEqual(puzzleFor(day(i)))
      expect(check(p, p.solution).ok).toBe(true)
      expect(countSolutions(p, 3)).toBe(1)
      expect(Object.keys(p.stones).length).toBeGreaterThan(0)
    }
  })
})
