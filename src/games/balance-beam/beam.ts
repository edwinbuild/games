// Balance Beam rules: a seesaw with pegs at distances -5…-1 and 1…5 from the pivot. Each weight
// turns the beam by mass × distance (its torque); the beam is level when the torques cancel out.
import { seededRandom } from '../../shell/daily'

export const PEGS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]
/** The weights you can place (as many of each as you like, one per peg). */
export const MASSES = [1, 2, 3]
export type Weight = { pos: number; mass: number }

export const torque = (ws: Weight[]) => ws.reduce((s, w) => s + w.mass * w.pos, 0)

/** The beam's resting tilt in degrees for a torque: more torque, more tilt, up to 16°. */
export const tiltFor = (t: number) => Math.max(-16, Math.min(16, t * 1.4))

/**
 * The fewest weights that level the beam, given the weights already on it (null if four or
 * more would be needed). Each free peg takes at most one weight.
 */
export function solve(fixed: Weight[], maxWeights = 4): { count: number; weights: Weight[] } | null {
  const t0 = torque(fixed)
  if (t0 === 0) return { count: 0, weights: [] }
  const free = PEGS.filter((p) => !fixed.some((w) => w.pos === p))
  // Breadth first over how many weights: try every choice of pegs and masses.
  for (let n = 1; n <= maxWeights; n++) {
    const pick: Weight[] = []
    const rec = (start: number, t: number): Weight[] | null => {
      if (pick.length === n) return t === 0 ? [...pick] : null
      for (let i = start; i < free.length; i++) {
        for (const m of MASSES) {
          pick.push({ pos: free[i], mass: m })
          const r = rec(i + 1, t + m * free[i])
          pick.pop()
          if (r) return r
        }
      }
      return null
    }
    const found = rec(0, t0)
    if (found) return { count: n, weights: found }
  }
  return null
}

/** The day's beam: two or three fixed weights, tilted, needing two or three of yours to level. */
export function puzzleFor(seed: string): { fixed: Weight[]; par: number } {
  const r = seededRandom(`balance-beam:${seed}`)
  for (;;) {
    const n = r() < 0.5 ? 2 : 3
    const pegs = [...PEGS].sort(() => r() - 0.5).slice(0, n)
    const fixed = pegs.map((pos) => ({ pos, mass: 1 + Math.floor(r() * 4) }))
    if (torque(fixed) === 0) continue
    const s = solve(fixed, 3)
    // Par 2 comes up far more often by chance; skip some of those so about a quarter of days are par 3.
    if (s && s.count === 2 && r() < 0.4) continue
    if (s && s.count >= 2) return { fixed, par: s.count }
  }
}
