import { describe, expect, it } from 'vitest'
import { AMPLITUDE, angleAt, inZone, roundFor } from './swing'

describe('Pendulum Stop', () => {
  it('swings from the left extreme through the middle to the right and back', () => {
    expect(angleAt(0, 1000)).toBeCloseTo(-AMPLITUDE)
    expect(angleAt(250, 1000)).toBeCloseTo(0)
    expect(angleAt(500, 1000)).toBeCloseTo(AMPLITUDE)
    expect(angleAt(1000, 1000)).toBeCloseTo(-AMPLITUDE)
  })
  it('counts zone edges as inside', () => {
    const r = { period: 1000, center: 10, width: 8 }
    expect(inZone(14, r)).toBe(true)
    expect(inZone(6, r)).toBe(true)
    expect(inZone(14.01, r)).toBe(false)
  })
  it('gets faster and tighter, with every zone reachable', () => {
    let prev = roundFor('s', 0)
    for (let k = 1; k < 60; k++) {
      const r = roundFor('s', k)
      expect(r.period).toBeLessThanOrEqual(prev.period)
      expect(r.width).toBeLessThanOrEqual(prev.width)
      expect(r.period).toBeGreaterThanOrEqual(550)
      expect(r.width).toBeGreaterThanOrEqual(4)
      expect(Math.abs(r.center) + r.width / 2).toBeLessThan(AMPLITUDE)
      prev = r
    }
  })
  it('gives a friend the same run from the same seed', () => {
    expect(roundFor('abc', 7)).toEqual(roundFor('abc', 7))
  })
})
