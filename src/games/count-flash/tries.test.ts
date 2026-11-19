import { describe, expect, it } from 'vitest'
import { countsFor } from './dots'
import { bestOf, errorOf, scoresOf, trySeed } from './tries'

describe('Count Flash tries', () => {
  it('reports the true average error, not one capped at 100% per field', () => {
    // Guesses far over the real count are more than 100% off; capping each at 100% understated the average.
    const t = { g: [10, 300, 100, 50, 400], n: [100, 100, 100, 100, 100] }
    const per = [90, 200, 0, 50, 300]
    expect(errorOf(t)).toBe(Math.round((per.reduce((a, b) => a + b, 0) / 5) * 10) / 10)
    expect(errorOf({ g: [112, 47], n: [100, 50] })).toBe(9)
    expect(errorOf({ g: [100], n: [100] })).toBe(0)
  })
  it('still scores each field 0–100 for the squares', () => {
    expect(scoresOf({ g: [300, 90], n: [100, 100] })).toEqual([0, 90])
  })
  it('reads old saved tries (scores only)', () => {
    expect(scoresOf([90, 80])).toEqual([90, 80])
    expect(errorOf([90, 80])).toBe(15)
  })
  it('picks the try with the smallest error', () => {
    const a = { g: [50], n: [100] }, b = { g: [95], n: [100] }
    expect(bestOf([a, b])).toBe(b)
  })
  it('gives every try of the day its own fields, the same for everyone', () => {
    const day = '2027-03-04'
    expect(countsFor(trySeed(day, 0))).toEqual(countsFor(day))
    expect(countsFor(trySeed(day, 1))).toEqual(countsFor(trySeed(day, 1)))
    expect(countsFor(trySeed(day, 1))).not.toEqual(countsFor(trySeed(day, 0)))
    expect(countsFor(trySeed(day, 2))).not.toEqual(countsFor(trySeed(day, 1)))
  })
})
