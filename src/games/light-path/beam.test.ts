import { describe, expect, it } from 'vitest'
import { allLit, boardFor, bounce, N, solvableWith, trace, type Cell } from './beam'

const empty = (): Cell[] => new Array(N * N).fill('')

describe('Light Path', () => {
  it('bounces off mirrors (y down)', () => {
    expect(bounce('/', 1, 0)).toEqual([-0, -1]) // east → north
    expect(bounce('\\', 1, 0)).toEqual([0, 1]) // east → south
    expect(bounce('/', 0, 1)).toEqual([-1, -0]) // south → west
  })
  it('traces a beam through mirrors, lighting targets, stopping at walls', () => {
    const c = empty()
    c[21] = 'laser' // row 3, col 0
    c[24] = '\\' // turns south at col 3
    c[38] = 'target' // row 5, col 3
    expect(trace(c, 21).path).toEqual([21, 22, 23, 24, 31, 38, 45])
    expect(allLit(c, 21)).toBe(true)
    c[31] = 'wall'
    expect(trace(c, 21).end).toBe('wall')
    expect(allLit(c, 21)).toBe(false)
  })
  it('stops loops', () => {
    const c = empty()
    c[8] = 'laser'; c[10] = '\\'; c[24] = '/'; c[22] = '\\'
    c[22] = '/'
    expect(['loop', 'edge', 'wall']).toContain(trace(c, 8).end)
  })
  it('makes every daily board for a year solvable with par mirrors and not fewer', () => {
    for (let d = 0; d < 365; d++) {
      const b = boardFor(`2027-day-${d}`)
      expect([2, 3]).toContain(b.par)
      const solved = b.cells.slice()
      for (const [i, m] of Object.entries(b.solution)) solved[+i] = m
      expect(allLit(solved, b.laser)).toBe(true)
      expect(allLit(b.cells, b.laser)).toBe(false)
      expect(solvableWith(b.cells, b.laser, b.par - 1)).toBe(false)
    }
  }, 60000)
})
