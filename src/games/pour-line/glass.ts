import { seededRandom } from '../../shell/daily'

// The glass is drawn upright with height 1. Each shape gives its inside width at a height y (0 = bottom, 1 = rim).
// Liquid pours at a steady rate by area, so the level rises fastest where the glass is narrowest.
export type Shape = 'straight' | 'tapered' | 'rounded' | 'bowl'
export const SHAPES: Record<Shape, (y: number) => number> = {
  straight: () => 0.62,
  tapered: (y) => 0.4 + 0.4 * y,
  rounded: (y) => 0.46 + 0.34 * Math.sin(Math.PI * Math.min(1, 0.15 + 0.85 * y)),
  bowl: (y) => 0.28 + 0.66 * Math.sqrt(y),
}
const ORDER: Shape[] = ['straight', 'tapered', 'rounded', 'bowl']

/** Liquid that has left the tap takes this long to land, so it keeps coming after you let go. */
export const FALL_S = 0.32
/** Within this many percent of the glass height, the pour is perfect. */
export const PERFECT = 1

export type Day = { shape: Shape; line: number; fillSeconds: number }

export function dayFor(seed: string): Day {
  const r = seededRandom(`pour-line:${seed}`)
  return {
    shape: ORDER[Math.floor(r() * ORDER.length)],
    line: Math.round((0.5 + r() * 0.35) * 1000) / 1000,
    fillSeconds: Math.round((2.4 + r() * 1.2) * 100) / 100,
  }
}

const STEPS = 400
/** Area of the glass below height h (0..1), by the trapezoid rule. */
export function areaBelow(shape: Shape, h: number): number {
  const w = SHAPES[shape]
  const top = Math.max(0, Math.min(1, h))
  const n = Math.max(1, Math.round(STEPS * top))
  const dy = top / n
  let a = 0
  for (let i = 0; i < n; i++) a += ((w(i * dy) + w((i + 1) * dy)) / 2) * dy
  return a
}

/** How full the glass is (share of its area) when the liquid is at height h. */
export const fullness = (shape: Shape, h: number) => areaBelow(shape, h) / areaBelow(shape, 1)

/** The liquid height for a given fullness (0..1), by bisection. */
export function levelFor(shape: Shape, f: number): number {
  if (f <= 0) return 0
  if (f >= 1) return 1
  let lo = 0, hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (fullness(shape, mid) < f) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** How full the glass is `t` seconds after the press, if released at `released` seconds (Infinity while holding). */
export function landedAt(day: Day, t: number, released = Infinity): number {
  return Math.max(0, Math.min(t - FALL_S, released)) / day.fillSeconds
}

export type Pour = { spilled: true } | { spilled: false; level: number; off: number; perfect: boolean }

/** The settled result of holding for `holdS` seconds. `off` is in percent of the glass height, to 0.1. */
export function result(day: Day, holdS: number): Pour {
  const f = holdS / day.fillSeconds
  if (f > 1) return { spilled: true }
  const level = levelFor(day.shape, f)
  const off = Math.round(Math.abs(level - day.line) * 1000) / 10
  return { spilled: false, level, off, perfect: off <= PERFECT }
}

/** The hold that lands exactly on the line. */
export const perfectHold = (day: Day) => fullness(day.shape, day.line) * day.fillSeconds
