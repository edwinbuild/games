import { describe, expect, it } from 'vitest'
import { angleAt, judge, roundsFor, ROUNDS } from './rounds'

describe('Angle Eye', () => {
  it('makes ten rounds of all four kinds, the same for a seed', () => {
    const r = roundsFor('x')
    expect(r).toHaveLength(ROUNDS)
    expect(new Set(r.map((x) => x.kind)).size).toBe(4)
    expect(r).toEqual(roundsFor('x'))
  })
  it('measures angles from the base ray', () => {
    expect(angleAt({ x: 0, y: 0 }, 0, { x: 0, y: -10 })).toBeCloseTo(90)
    expect(angleAt({ x: 0, y: 0 }, 0, { x: -10, y: 0 })).toBeCloseTo(180)
  })
  it('scores a perfect answer 10 and a far one 0', () => {
    const angle = { kind: 'angle' as const, origin: { x: 50, y: 50 }, base: 0, target: 90 }
    expect(judge(angle, { x: 50, y: 20 }).score).toBe(10)
    expect(judge(angle, { x: 80, y: 50 }).score).toBe(0)
    const mid = { kind: 'middle' as const, a: { x: 10, y: 50 }, b: { x: 90, y: 50 } }
    expect(judge(mid, { x: 50, y: 60 }).score).toBe(10) // only the position along the line counts
    expect(judge(mid, { x: 54, y: 50 }).score).toBe(5)
    const dbl = { kind: 'double' as const, a: { x: 10, y: 50 }, b: { x: 30, y: 50 } }
    expect(judge(dbl, { x: 50, y: 50 }).score).toBe(10)
    const c = { kind: 'centre' as const, c: { x: 50, y: 50 }, r: 20 }
    expect(judge(c, { x: 50, y: 50 }).score).toBe(10)
    expect(judge(c, { x: 54, y: 50 }).score).toBe(8) // 20% of the radius off
  })
})
