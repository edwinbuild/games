// Balance Beam rules. A seesaw (the top beam) has pegs at distances -5…-1 and 1…5 from its pivot.
// Each weight turns a beam by mass × distance (its torque); a beam is level when its torques cancel.
// From Thursday to Sunday a second, smaller beam hangs from one of the top beam's pegs: it must
// level itself, and all the weight on it pulls on the top beam at the peg it hangs from.
import { parseDateKey, seededRandom } from '../../shell/daily'

export const PEGS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]
export const LOW_PEGS = [-3, -2, -1, 1, 2, 3]
/** The tray: two weights of each size. */
export const MASSES = [1, 2, 3, 4, 5]
export const PER_MASS = 2

export type BeamId = 'top' | 'low'
export type Weight = { beam: BeamId; pos: number; mass: number }
export type Puzzle = { fixed: Weight[]; hangAt: number | null; par: number }

const on = (ws: Weight[], b: BeamId) => ws.filter((w) => w.beam === b)
const sum = (ws: Weight[]) => ws.reduce((s, w) => s + w.mass * w.pos, 0)

/** Torque on each beam. The hanging beam's whole weight acts on the top beam at `hangAt`. */
export function torques(ws: Weight[], hangAt: number | null): { top: number; low: number } {
  const low = on(ws, 'low')
  return { top: sum(on(ws, 'top')) + (hangAt == null ? 0 : hangAt * low.reduce((s, w) => s + w.mass, 0)), low: sum(low) }
}
export const level = (ws: Weight[], hangAt: number | null) => { const t = torques(ws, hangAt); return t.top === 0 && t.low === 0 }

/** A beam's resting tilt in degrees for a torque: more torque, more tilt, up to 16°. */
export const tiltFor = (t: number) => Math.max(-16, Math.min(16, t * 1.2))

/** Pegs that can still take one of your weights. */
export function freeSlots(p: { fixed: Weight[]; hangAt: number | null }): { beam: BeamId; pos: number }[] {
  const top = PEGS.filter((x) => x !== p.hangAt && !p.fixed.some((w) => w.beam === 'top' && w.pos === x)).map((pos) => ({ beam: 'top' as const, pos }))
  const low = p.hangAt == null ? [] : LOW_PEGS.filter((x) => !p.fixed.some((w) => w.beam === 'low' && w.pos === x)).map((pos) => ({ beam: 'low' as const, pos }))
  return [...top, ...low]
}

/** How many of each size you have left after placing `mine`. */
export const trayLeft = (mine: Weight[]) => MASSES.map((m) => PER_MASS - mine.filter((w) => w.mass === m).length)

/**
 * The fewest of your weights that level everything (one per free peg, at most two of each size),
 * or null if more than `max` would be needed.
 */
export function solve(p: { fixed: Weight[]; hangAt: number | null }, max = 4): { count: number; weights: Weight[] } | null {
  if (level(p.fixed, p.hangAt)) return { count: 0, weights: [] }
  const slots = freeSlots(p)
  const left = MASSES.map(() => PER_MASS)
  const pick: Weight[] = []
  for (let n = 1; n <= max; n++) {
    const rec = (start: number): Weight[] | null => {
      if (pick.length === n) return level([...p.fixed, ...pick], p.hangAt) ? [...pick] : null
      for (let i = start; i < slots.length; i++) {
        for (let m = 0; m < MASSES.length; m++) {
          if (!left[m]) continue
          left[m]--
          pick.push({ ...slots[i], mass: MASSES[m] })
          const r = rec(i + 1)
          pick.pop()
          left[m]++
          if (r) return r
        }
      }
      return null
    }
    const found = rec(0)
    if (found) return { count: n, weights: found }
  }
  return null
}

/** Thursday to Sunday have the hanging second beam. */
export const twoBeams = (seed: string) => { const d = parseDateKey(seed); return d ? [0, 4, 5, 6].includes(d.getDay()) : false }

/** The day's beam(s): tipped by fixed weights and needing three or four of yours to level. */
export function puzzleFor(seed: string): Puzzle {
  const r = seededRandom(`balance-beam:v2:${seed}`)
  const two = twoBeams(seed)
  for (;;) {
    // Peg 2 or 3 either side: further out, the lower beam would hang off the edge of a phone screen.
    const hangAt = two ? (r() < 0.5 ? -1 : 1) * (2 + Math.floor(r() * 2)) : null
    const fixed: Weight[] = []
    const topPegs = PEGS.filter((x) => x !== hangAt).sort(() => r() - 0.5).slice(0, 2 + Math.floor(r() * 2))
    for (const pos of topPegs) fixed.push({ beam: 'top', pos, mass: 1 + Math.floor(r() * 6) })
    if (two) {
      const lowPegs = [...LOW_PEGS].sort(() => r() - 0.5).slice(0, 1 + Math.floor(r() * 2))
      for (const pos of lowPegs) fixed.push({ beam: 'low', pos, mass: 1 + Math.floor(r() * 5) })
    }
    const t = torques(fixed, hangAt)
    if (t.top === 0 || (two && t.low === 0)) continue
    const s = solve({ fixed, hangAt }, 4)
    if (s && s.count >= 3) return { fixed, hangAt, par: s.count }
  }
}
