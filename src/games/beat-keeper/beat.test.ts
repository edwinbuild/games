import { describe, expect, it } from 'vitest'
import { LEAD, periodMs, score, SILENT, tempoFor } from './beat'

const beats = (bpm: number, f: (k: number) => number) => Array.from({ length: SILENT }, (_, k) => 1000 + (LEAD + k) * periodMs(bpm) + f(k))

describe('Beat Keeper', () => {
  it('scores perfect taps as 0 ms and steady', () => {
    expect(score(beats(100, () => 0), 1000, 100)).toMatchObject({ mean: 0, drift: 'steady' })
  })
  it('measures a constant offset without calling it drift', () => {
    const r = score(beats(120, () => 25), 1000, 120)
    expect(r.mean).toBe(25)
    expect(r.drift).toBe('steady')
    expect(r.errors.every((e) => e === 25)).toBe(true)
  })
  it('detects drifting slow and fast', () => {
    expect(score(beats(100, (k) => k * 12), 1000, 100).drift).toBe('slow')
    expect(score(beats(100, (k) => -k * 12), 1000, 100).drift).toBe('fast')
  })
  it('counts a missed beat as the worst error, half a beat', () => {
    const taps = beats(100, () => 0).filter((_, k) => k !== 3)
    const r = score(taps, 1000, 100)
    expect(r.errors[3]).toBeNull()
    expect(r.mean).toBe(Math.round(periodMs(100) / 2 / SILENT))
  })
  it('ignores taps during the lead-in and extra taps', () => {
    const taps = [1000, 1600, ...beats(100, () => 10), ...beats(100, () => 200)]
    expect(score(taps, 1000, 100).mean).toBe(10)
  })
  it('gives everyone the same tempo, between 80 and 130 bpm', () => {
    expect(tempoFor('a')).toBe(tempoFor('a'))
    for (let i = 0; i < 100; i++) {
      const t = tempoFor(`d${i}`)
      expect(t).toBeGreaterThanOrEqual(80)
      expect(t).toBeLessThanOrEqual(130)
      expect(t % 5).toBe(0)
    }
  })
})
