import { describe, expect, it } from 'vitest'
import { dateKey, dayNumber, msUntilTomorrow, previousDateKey, puzzleLabel, seededRandom } from './daily'

describe('daily', () => {
  it('formats local dates', () => {
    expect(dateKey(new Date(2027, 0, 5, 23, 59))).toBe('2027-01-05')
    expect(previousDateKey(new Date(2027, 2, 1))).toBe('2027-02-28')
  })

  it('numbers days from launch', () => {
    expect(dayNumber(new Date(2027, 0, 1, 0, 1))).toBe(1)
    expect(dayNumber(new Date(2027, 0, 1, 23, 59))).toBe(1)
    expect(dayNumber(new Date(2027, 1, 1))).toBe(32)
    expect(puzzleLabel(new Date(2027, 0, 3))).toBe('#3')
    expect(puzzleLabel(new Date(2026, 10, 18))).toBe('2026-11-18')
  })

  it('gives everyone the same puzzle for the same seed', () => {
    const a = seededRandom('blind-timer:2027-01-01')
    const b = seededRandom('blind-timer:2027-01-01')
    const c = seededRandom('blind-timer:2027-01-02')
    const seqA = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(seqA)
    expect(c()).not.toBe(seqA[0])
    for (const x of seqA) expect(x).toBeGreaterThanOrEqual(0), expect(x).toBeLessThan(1)
  })

  it('counts down to midnight', () => {
    expect(msUntilTomorrow(new Date(2027, 0, 1, 23, 59, 0))).toBe(60_000)
  })
})
