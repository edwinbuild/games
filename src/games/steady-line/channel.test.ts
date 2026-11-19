import { describe, expect, it } from 'vitest'
import { channelFor, halfWidth, NARROW, nearest, percent, step, WIDE, W, H } from './channel'

describe('Steady Line', () => {
  const c = channelFor('2027-01-01')
  it('builds the same channel from the same seed, inside the board', () => {
    expect(channelFor('2027-01-01')).toEqual(c)
    for (const p of c.points) {
      expect(p.x).toBeGreaterThan(WIDE)
      expect(p.x).toBeLessThan(W - WIDE)
      expect(p.y).toBeGreaterThan(0)
      expect(p.y).toBeLessThan(H)
    }
  })
  it('narrows from start to finish', () => {
    expect(halfWidth(c, 0)).toBe(WIDE)
    expect(halfWidth(c, c.total)).toBe(NARROW)
    expect(halfWidth(c, c.total / 2)).toBeCloseTo((WIDE + NARROW) / 2)
  })
  it('follows a trace down the middle all the way, and stops at an edge', () => {
    let s = 0
    for (const p of c.points) { const r = step(c, p, s); expect(r.ok).toBe(true); s = r.s }
    expect(percent(c, s)).toBe(100)
    const mid = c.points[120], a = c.points[119], b = c.points[121]
    const len = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len
    const out = halfWidth(c, c.lengths[120]) + 3
    const off = step(c, { x: mid.x + nx * out, y: mid.y + ny * out }, c.lengths[118])
    expect(off.ok).toBe(false)
  })
  it('counts the last few units as the finish, and never rounds a partial run up to 100', () => {
    expect(percent(c, c.total - 5)).toBe(100)
    expect(percent(c, c.total - 7)).toBeLessThan(100)
    expect(percent(c, c.total - 7)).toBeGreaterThanOrEqual(98)
    expect(percent(c, c.total / 2)).toBe(50)
  })
  it('does not let you jump ahead across a bend', () => {
    const far = c.points[200]
    expect(nearest(c, far, 0).s).toBeLessThan(120)
  })
})
