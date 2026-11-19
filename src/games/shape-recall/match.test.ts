import { describe, expect, it } from 'vitest'
import { matchScore, shapesFor } from './match'
import { seededRandom } from '../../shell/daily'

describe('Shape Recall', () => {
  const [zig, curve, loop] = shapesFor('2027-01-01')
  it('scores an exact copy 100, in either direction', () => {
    for (const s of [zig, curve, loop]) {
      expect(matchScore(s.points, s.points)).toBe(100)
      expect(matchScore(s.points, [...s.points].reverse())).toBe(100)
    }
  })
  it('still scores a moved or resized copy 100', () => {
    const moved = curve.points.map((p) => ({ x: p.x * 0.6 + 40, y: p.y * 0.6 - 10 }))
    expect(matchScore(curve.points, moved)).toBe(100)
  })
  it('scores a shaky copy high and a different shape low', () => {
    const r = seededRandom('shake')
    const shaky = loop.points.map((p) => ({ x: p.x + (r() - 0.5) * 16, y: p.y + (r() - 0.5) * 16 }))
    expect(matchScore(loop.points, shaky)).toBeGreaterThan(80)
    expect(matchScore(zig.points, loop.points)).toBeLessThan(60)
    expect(matchScore(loop.points, zig.points)).toBeLessThan(60)
    expect(matchScore(loop.points, [{ x: 0, y: 0 }, { x: 300, y: 300 }])).toBeLessThan(40)
  })
  it('gives each try its own shapes, the same for everyone', () => {
    expect(shapesFor('2027-01-01', 1)).toEqual(shapesFor('2027-01-01', 1))
    expect(shapesFor('2027-01-01', 1)).not.toEqual(shapesFor('2027-01-01', 0))
    expect(shapesFor('2027-01-01', 0)).toEqual(shapesFor('2027-01-01'))
  })
  it('gives everyone the same three shapes, inside the board', () => {
    expect(shapesFor('x')).toEqual(shapesFor('x'))
    for (let d = 0; d < 50; d++) for (const s of shapesFor(`d${d}`)) for (const p of s.points) {
      expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(300); expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(300)
    }
  })
})
