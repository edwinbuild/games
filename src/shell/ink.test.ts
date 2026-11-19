import { describe, expect, it } from 'vitest'
import { length, resample, simplify, smooth } from './ink'

const line = Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 0 }))

describe('ink', () => {
  it('smooths a jagged stroke but keeps its ends', () => {
    const zig = Array.from({ length: 21 }, (_, i) => ({ x: i * 5, y: i % 2 ? 6 : -6 }))
    const s = smooth(zig)
    expect(s[0]).toEqual(zig[0])
    expect(s[20]).toEqual(zig[20])
    expect(Math.max(...s.slice(2, -2).map((p) => Math.abs(p.y)))).toBeLessThan(3)
  })
  it('simplifies a straight line to its ends and keeps corners', () => {
    expect(simplify(line)).toEqual([line[0], line[10]])
    const corner = [...line, { x: 100, y: 10 }, { x: 100, y: 50 }]
    expect(simplify(corner, 1).length).toBe(3)
  })
  it('resamples evenly along the stroke', () => {
    const r = resample([{ x: 0, y: 0 }, { x: 100, y: 0 }], 5)
    expect(r.map((p) => Math.round(p.x))).toEqual([0, 25, 50, 75, 100])
    const bent = resample([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }], 5)
    expect(bent.length).toBe(5)
    expect(bent[2].x).toBeCloseTo(50)
    expect(bent[2].y).toBeCloseTo(0)
    expect(length(line)).toBe(100)
  })
})
