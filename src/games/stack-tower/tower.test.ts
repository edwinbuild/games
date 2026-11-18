import { describe, expect, it } from 'vitest'
import { dayFor, drop, PERFECT, slide, speedFor, W } from './tower'

describe('Stack Tower', () => {
  const below = { x: 100, w: 100 }
  it('keeps the full width on a perfect drop, within 3 units either side', () => {
    expect(drop({ x: 100 + PERFECT, w: 100 }, below)).toEqual({ kind: 'perfect', placed: below })
    expect(drop({ x: 100 - PERFECT, w: 100 }, below).kind).toBe('perfect')
    expect(drop({ x: 100 + PERFECT + 1, w: 100 }, below).kind).toBe('cut')
  })
  it('cuts off the overhang on either side', () => {
    expect(drop({ x: 130, w: 100 }, below)).toEqual({ kind: 'cut', placed: { x: 130, w: 70 }, cut: { x: 200, w: 30 } })
    expect(drop({ x: 60, w: 100 }, below)).toEqual({ kind: 'cut', placed: { x: 100, w: 60 }, cut: { x: 60, w: 40 } })
  })
  it('misses when nothing overlaps', () => {
    expect(drop({ x: 200, w: 50 }, below)).toEqual({ kind: 'miss' })
    expect(drop({ x: 0, w: 100 }, below)).toEqual({ kind: 'miss' })
  })
  it('gives everyone the same day, within sensible bounds', () => {
    expect(dayFor('2027-01-01')).toEqual(dayFor('2027-01-01'))
    for (let i = 0; i < 200; i++) {
      const d = dayFor(`s${i}`)
      expect(d.startWidth).toBeGreaterThanOrEqual(150)
      expect(d.startWidth).toBeLessThanOrEqual(210)
      expect(d.step).toBeGreaterThanOrEqual(1.08)
      expect(d.step).toBeLessThanOrEqual(1.16)
    }
  })
  it('speeds up every five blocks', () => {
    const d = { startWidth: 180, speed: 150, step: 1.1 }
    expect(speedFor(d, 0)).toBe(150)
    expect(speedFor(d, 4)).toBe(150)
    expect(speedFor(d, 5)).toBeCloseTo(165)
    expect(speedFor(d, 10)).toBeCloseTo(181.5)
  })
  it('slides back and forth inside the play area', () => {
    const w = 100
    expect(slide(w, 100, 0, false)).toBe(0)
    expect(slide(w, 100, 1, false)).toBe(100)
    expect(slide(w, 100, 2, false)).toBe(200)
    expect(slide(w, 100, 3, false)).toBe(100)
    expect(slide(w, 100, 0, true)).toBe(W - w)
    for (let t = 0; t < 20; t += 0.37) {
      const x = slide(w, 137, t, t > 10)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(W - w)
    }
  })
})
