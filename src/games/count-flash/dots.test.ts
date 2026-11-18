import { describe, expect, it } from 'vitest'
import { countsFor, placeDots, roundScore } from './dots'

describe('Count Flash', () => {
  it('gives five counts between 12 and 300, the same for the same seed', () => {
    const c = countsFor('2027-01-04')
    expect(c).toHaveLength(5)
    expect(c).toEqual(countsFor('2027-01-04'))
    for (const n of c) expect(n).toBeGreaterThanOrEqual(12), expect(n).toBeLessThanOrEqual(300)
  })
  it('places exactly n dots, inside the field, never overlapping', () => {
    for (const n of [12, 75, 300]) {
      const dots = placeDots(n, 'test')
      expect(dots).toHaveLength(n)
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i]
        expect(a.x - a.r).toBeGreaterThanOrEqual(0)
        expect(a.x + a.r).toBeLessThanOrEqual(100)
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j]
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r)
        }
      }
    }
  })
  it('scores by percentage error', () => {
    expect(roundScore(100, 100)).toBe(100)
    expect(roundScore(90, 100)).toBe(90)
    expect(roundScore(400, 100)).toBe(0)
  })
})
