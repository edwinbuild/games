import { describe, expect, it } from 'vitest'
import { boardFor, EAST, flow, N, NORTH, solved, SOUTH, turn, turnsBetween, WEST } from './pipes'

describe('Pipe Turn', () => {
  it('turns pieces clockwise', () => {
    expect(turn(NORTH)).toBe(EAST)
    expect(turn(WEST)).toBe(NORTH)
    expect(turn(NORTH | EAST, 2)).toBe(SOUTH | WEST)
    expect(turn(NORTH | SOUTH)).toBe(EAST | WEST)
    expect(turnsBetween(NORTH | EAST, WEST | NORTH)).toBe(3)
    expect(turnsBetween(NORTH | SOUTH, NORTH | EAST)).toBe(-1)
  })
  it('lets water through matching openings only', () => {
    const p = new Array(N * N).fill(0)
    p[0] = WEST | EAST; p[1] = WEST | SOUTH; p[1 + N] = NORTH | EAST; p[2 + N] = WEST
    expect([...flow(p, 0)].sort((a, b) => a - b)).toEqual([0, 1, 1 + N, 2 + N])
    p[1] = WEST | NORTH
    expect([...flow(p, 0)].sort((a, b) => a - b)).toEqual([0, 1])
  })
  it('makes every daily board for a year solvable in exactly par turns, and not solved at the start', () => {
    for (let d = 0; d < 365; d++) {
      const b = boardFor(`2027-day-${d}`)
      expect(solved(b.pieces, b.source, b.sink)).toBe(false)
      expect(b.par).toBeGreaterThanOrEqual(6)
      let turns = 0
      const done = b.pieces.map((m, i) => { const k = turnsBetween(m, b.solution[i]); turns += k; return b.solution[i] })
      expect(turns).toBe(b.par)
      expect(solved(done, b.source, b.sink)).toBe(true)
      expect(b.pieces[b.sink] || 0).not.toBe(0)
    }
  })
  it('gives everyone the same board', () => {
    expect(boardFor('x')).toEqual(boardFor('x'))
    expect(EAST).toBe(2)
  })
})
