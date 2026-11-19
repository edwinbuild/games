import { describe, expect, it } from 'vitest'
import { dayFor, FALL_S, fullness, landedAt, levelFor, perfectHold, result, SHAPES, type Shape } from './glass'

const shapes = Object.keys(SHAPES) as Shape[]

describe('Pour Line', () => {
  it('fills a straight glass evenly', () => {
    for (const f of [0.1, 0.37, 0.5, 0.9]) expect(levelFor('straight', f)).toBeCloseTo(f, 4)
  })
  it('turns fullness into level and back for every shape', () => {
    for (const s of shapes) {
      let prev = 0
      for (let h = 0.05; h <= 1; h += 0.05) {
        const f = fullness(s, h)
        expect(f).toBeGreaterThan(prev)
        expect(levelFor(s, f)).toBeCloseTo(h, 3)
        prev = f
      }
      expect(fullness(s, 1)).toBeCloseTo(1, 6)
    }
  })
  it('rises faster where the glass is narrow', () => {
    expect(levelFor('tapered', 0.5)).toBeGreaterThan(0.55)
    expect(levelFor('bowl', 0.5)).toBeGreaterThan(0.55)
  })
  it('keeps landing for a moment after release', () => {
    const d = { shape: 'straight' as const, line: 0.7, fillSeconds: 3 }
    expect(landedAt(d, 1, 1)).toBeCloseTo((1 - FALL_S) / 3)
    expect(landedAt(d, 1 + FALL_S, 1)).toBeCloseTo(1 / 3)
    expect(landedAt(d, 5, 1)).toBeCloseTo(1 / 3)
    expect(landedAt(d, 0.2)).toBe(0)
  })
  it('scores the settled level against the line, and spills past the rim', () => {
    for (let i = 0; i < 50; i++) {
      const d = dayFor(`s${i}`)
      const r = result(d, perfectHold(d))
      expect(r).toMatchObject({ spilled: false, off: 0, perfect: true })
      const low = result(d, perfectHold(d) * 0.8)
      expect(low.spilled).toBe(false)
      if (!low.spilled) expect(low.off).toBeGreaterThan(1)
      expect(result(d, d.fillSeconds * 1.01).spilled).toBe(true)
    }
  })
  it('gives everyone the same glass, within sensible bounds', () => {
    expect(dayFor('2027-01-01')).toEqual(dayFor('2027-01-01'))
    const seen = new Set<string>()
    for (let i = 0; i < 365; i++) {
      const d = dayFor(`d${i}`)
      seen.add(d.shape)
      expect(d.line).toBeGreaterThanOrEqual(0.5)
      expect(d.line).toBeLessThanOrEqual(0.85)
      expect(d.fillSeconds).toBeGreaterThanOrEqual(2.4)
      expect(d.fillSeconds).toBeLessThanOrEqual(3.6)
      // The perfect hold is long enough to judge, and the after-pour is a real part of it.
      expect(perfectHold(d)).toBeGreaterThan(1)
    }
    expect(seen.size).toBe(4)
  })
})
