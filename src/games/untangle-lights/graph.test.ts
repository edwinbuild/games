import { describe, expect, it } from 'vitest'
import { clampToBoard, crossings, graphFor, lightsFor, MARGIN, segmentsCross, SIZE } from './graph'

const day = (i: number) => { const d = new Date(2027, 0, 4 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

describe('Untangle Lights', () => {
  it('finds crossings, but not wires that only share a light or merely touch', () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(true)
    expect(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBe(false)
    expect(crossings([[0, 1], [1, 2]], [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 0, y: 10 }])).toEqual([])
  })
  it('grows from 8 lights on Monday to 12 on Sunday', () => {
    expect(lightsFor('2027-01-04')).toBe(8) // Monday
    expect(lightsFor('2027-01-10')).toBe(12) // Sunday
  })
  it('makes every day solvable: tangled at the start, untangled in the layout it was built from', () => {
    for (let i = 0; i < 60; i++) {
      const g = graphFor(day(i))
      expect(g).toEqual(graphFor(day(i)))
      expect(crossings(g.edges, g.solved)).toEqual([])
      expect(crossings(g.edges, g.start).length).toBeGreaterThanOrEqual(g.n)
      expect(g.edges.length).toBeGreaterThanOrEqual(g.n)
      for (const p of [...g.start, ...g.solved]) {
        expect(p.x).toBeGreaterThanOrEqual(MARGIN)
        expect(p.x).toBeLessThanOrEqual(SIZE - MARGIN)
      }
    }
  })
  it('keeps dragged lights on the board', () => {
    expect(clampToBoard({ x: -50, y: 900 })).toEqual({ x: MARGIN, y: SIZE - MARGIN })
  })
})
