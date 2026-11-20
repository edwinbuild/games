import { describe, expect, it } from 'vitest'
import { DAMP as D, fallen, forceOf, G, gustsFor, LEN, startState, step, W, windAt, type State } from './physics'

const DT = 1 / 240
/** Runs a game with a "player" that picks where to put the ball from what it sees. */
function play(seed: string, player: (s: State, wind: number) => number, upTo = 60): number {
  const { lean, gusts } = gustsFor(seed)
  let s = startState(lean)
  while (s.t < upTo) {
    const wind = windAt(gusts, s.t)
    s = step(s, player(s, wind), wind, DT)
    if (fallen(s)) return s.t
  }
  return s.t
}

// A steady hand: lean into the wind and move the ball under the lean, drifting back to the middle
// (the textbook controller for a stick on a cart, drag included, all four poles at -p).
const k = 3 / (2 * LEN), kG = k * G, p = 2.5
const f1 = p ** 4 / kG, f2 = (4 * p ** 3 + f1 * D) / kG, f4 = (4 * p - D + f2) / k, f3 = (6 * p * p + kG + f1 + f2 * D) / k
const steady = (s: State, wind: number) => {
  const lean = -Math.atan(wind / G)
  const push = f1 * (s.x - W / 2) + f2 * s.v + f3 * (s.th - lean) + f4 * s.om
  return s.x + (push + 60 * s.v) / 900
}

describe('stick up', () => {
  it('falls in a couple of seconds if you don’t move', () => {
    for (const seed of ['a', 'b', 'c']) expect(play(seed, (s) => s.x)).toBeLessThan(4)
  })
  it('a steady hand gets through the first 20 seconds of every run, but the wind always wins in the end', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const t = play(seed, steady, 120)
      expect(t).toBeGreaterThanOrEqual(20)
      expect(t).toBeLessThan(120)
    }
  })
  it('gusts start after 4 seconds, get stronger, and are the same for everyone with a seed', () => {
    const { gusts, lean } = gustsFor('x')
    expect(gustsFor('x')).toEqual({ gusts, lean })
    expect(gusts[0].start).toBe(4)
    expect(Math.abs(lean)).toBeGreaterThan(0.03)
    expect(gusts[10].peak).toBeGreaterThan(gusts[0].peak)
    expect(Math.abs(windAt(gusts, 1))).toBeLessThan(G * 0.06)
    expect(forceOf(gusts, 1)).toBe(1)
    expect(forceOf(gusts, 60)).toBeGreaterThan(forceOf(gusts, 10))
  })
  it('the ball stops at the edges', () => {
    let s = startState(0)
    for (let i = 0; i < 480; i++) s = step(s, -500, 0, DT)
    expect(s.x).toBeGreaterThanOrEqual(30)
  })
})
