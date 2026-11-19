import { describe, expect, it } from 'vitest'
import { area, average, grade, offBy, shapesFor, split, type Poly } from './geometry'

const square: Poly = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
const P = (x: number, y: number) => ({ x, y })

describe('Fair Slice', () => {
  it('measures areas', () => {
    expect(area(square)).toBe(10000)
    expect(area([P(0, 0), P(10, 0), P(0, 10)])).toBe(50)
  })
  it('cuts a square through its centre exactly in half, at any angle', () => {
    for (const deg of [0, 17, 45, 90, 133]) {
      const a = (deg * Math.PI) / 180
      const s = split(square, P(50 - Math.cos(a) * 80, 50 - Math.sin(a) * 80), P(50 + Math.cos(a) * 80, 50 + Math.sin(a) * 80))
      expect(s.left).toBeCloseTo(50, 9)
      expect(offBy(s)).toBe(0)
    }
  })
  it('gives 100/0 for a line that misses the shape', () => {
    const s = split(square, P(-10, 0), P(-10, 100))
    expect(Math.min(s.left, s.right)).toBe(0)
  })
  it('splits off a known share', () => {
    expect(split(square, P(25, 0), P(25, 100)).left).toBeCloseTo(25, 9)
    expect(offBy(split(square, P(25, 0), P(25, 100)))).toBe(25)
  })
  it('counts every piece on one side of the line as that side for concave shapes', () => {
    // A U shape: two arms joined at the bottom. A cut across both arms leaves three pieces.
    const u: Poly = [P(0, 0), P(90, 0), P(90, 90), P(60, 90), P(60, 30), P(30, 30), P(30, 90), P(0, 90)]
    const total = area(u) // 90*30 + 2*30*60 = 6300
    expect(total).toBe(6300)
    const s = split(u, P(0, 60), P(90, 60)) // y = 60: above (y > 60 on the right of the direction) are the two arm tips
    const tips = 2 * 30 * 30
    expect(Math.min(s.left, s.right)).toBeCloseTo((tips / total) * 100, 6)
  })
  it('gives everyone the same five shapes, each a proper shape centred in the world', () => {
    const a = shapesFor('2027-01-01'), b = shapesFor('2027-01-01')
    expect(a).toEqual(b)
    for (let d = 0; d < 100; d++) {
      const shapes = shapesFor(`d${d}`)
      expect(shapes.map((s) => s.name)).toEqual(['square', 'triangle', 'bitten', 'star', 'blob'])
      for (const s of shapes) {
        expect(area(s.poly)).toBeGreaterThan(9000)
        for (const p of s.poly) {
          expect(p.x).toBeGreaterThan(5)
          expect(p.x).toBeLessThan(295)
          expect(p.y).toBeGreaterThan(5)
          expect(p.y).toBeLessThan(295)
        }
      }
    }
  })
  it('grades and averages cuts', () => {
    expect([0.4, 1, 2.9, 3.1].map(grade)).toEqual(['hit', 'hit', 'near', 'miss'])
    expect(average([0.4, 1.2, 2, 0, 3.4])).toBe(1.4)
  })
})
