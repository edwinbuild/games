import { seededRandom } from '../../shell/daily'

/** World units: the play area is W wide; every block is H tall. */
export const W = 300
export const H = 22
/** A drop this close to the block below counts as perfect and keeps the full width. */
export const PERFECT = 3

export type Block = { x: number; w: number }
export type Day = { startWidth: number; speed: number; step: number }
export type Drop =
  | { kind: 'perfect'; placed: Block }
  | { kind: 'cut'; placed: Block; cut: Block }
  | { kind: 'miss' }

/** The day's tower: starting width, starting speed (units per second) and how much faster every five blocks. */
export function dayFor(seed: string): Day {
  const r = seededRandom(`stack-tower:${seed}`)
  return {
    startWidth: Math.round(150 + r() * 60),
    speed: Math.round(130 + r() * 40),
    step: Math.round((1.08 + r() * 0.08) * 100) / 100,
  }
}

/** Speed for the block about to be placed, given how many are already stacked (excluding the base). */
export function speedFor(day: Day, stacked: number): number {
  return day.speed * day.step ** Math.floor(stacked / 5)
}

/** Drops the moving block onto the one below. */
export function drop(moving: Block, below: Block): Drop {
  if (Math.abs(moving.x - below.x) <= PERFECT) return { kind: 'perfect', placed: { ...below } }
  const l = Math.max(moving.x, below.x)
  const r = Math.min(moving.x + moving.w, below.x + below.w)
  if (r - l <= 0) return { kind: 'miss' }
  const placed = { x: l, w: r - l }
  const cut = moving.x < below.x ? { x: moving.x, w: below.x - moving.x } : { x: r, w: moving.x + moving.w - r }
  return { kind: 'cut', placed, cut }
}

/** Where a block sliding back and forth across the play area is after `t` seconds, starting at an edge. */
export function slide(w: number, speed: number, t: number, fromRight: boolean): number {
  const span = W - w
  if (span <= 0) return 0
  const d = (speed * t) % (2 * span)
  const x = d <= span ? d : 2 * span - d
  return fromRight ? span - x : x
}
