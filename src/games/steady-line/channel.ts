import { seededRandom } from '../../shell/daily'
import type { P } from '../../shell/ink'

/** The board is W×H world units; the channel winds from the bottom (start) to the top (finish). */
export const W = 300
export const H = 420
/** Half the channel's width at the start and at the finish. */
export const WIDE = 24
export const NARROW = 9
/** You must put your finger down this close to the start. */
export const START_R = 22

export type Channel = { points: P[]; lengths: number[]; total: number }

/** The day's channel: a smooth wiggle from bottom to top, the same for everyone. */
export function channelFor(seed: string): Channel {
  const r = seededRandom(`steady-line:${seed}`)
  const waves = Array.from({ length: 3 }, (_, i) => ({ amp: [70, 20, 6][i] * (0.7 + r() * 0.5), freq: [1.0, 2.0, 3.2][i] * (0.8 + r() * 0.4), phase: r() * Math.PI * 2 }))
  const raw = Array.from({ length: 241 }, (_, k) => {
    const t = k / 240
    return { t, dx: waves.reduce((s, w) => s + w.amp * Math.sin(t * w.freq * Math.PI * 2 + w.phase), 0) * Math.min(1, t * 6) }
  })
  // Scale the wiggle to fit the board, rather than clipping it (clipping makes sharp kinks).
  const room = W / 2 - WIDE - 10
  const most = Math.max(...raw.map((p) => Math.abs(p.dx)), 1)
  const scale = Math.min(1, room / most)
  const points: P[] = raw.map(({ t, dx }) => ({ x: W / 2 + dx * scale, y: H - 30 - t * (H - 60) }))
  const lengths = [0]
  for (let k = 1; k < points.length; k++) lengths.push(lengths[k - 1] + Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y))
  return { points, lengths, total: lengths[lengths.length - 1] }
}

/** Half-width of the channel at a distance `s` along it. */
export const halfWidth = (c: Channel, s: number) => WIDE + (NARROW - WIDE) * Math.min(1, Math.max(0, s / c.total))

/**
 * The nearest point on the channel's centre line to p, searching only near the progress so far
 * (so you can't jump ahead across a bend). Returns how far along it is and how far p is from it.
 */
export function nearest(c: Channel, p: P, from: number, ahead = 60): { s: number; dist: number } {
  let best = { s: from, dist: Infinity }
  for (let k = 1; k < c.points.length; k++) {
    if (c.lengths[k] < from - 30 || c.lengths[k - 1] > from + ahead) continue
    const a = c.points[k - 1], b = c.points[k]
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0
    const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
    if (d < best.dist) best = { s: c.lengths[k - 1] + t * Math.sqrt(l2), dist: d }
  }
  return best
}

export type Step = { ok: true; s: number } | { ok: false; s: number }
/** Moves the run on to point p: still inside the channel, or touched the edge. Progress never goes back. */
export function step(c: Channel, p: P, progress: number): Step {
  const n = nearest(c, p, progress)
  if (n.dist > halfWidth(c, n.s)) return { ok: false, s: progress }
  return { ok: true, s: Math.max(progress, n.s) }
}

/** Reaching this close to the end counts as finishing. */
export const FINISH = 6
/** Share of the channel completed, in whole percent (100 once within FINISH of the end). */
export const percent = (c: Channel, s: number) => (s >= c.total - FINISH ? 100 : Math.min(99, Math.floor((s / c.total) * 100)))
