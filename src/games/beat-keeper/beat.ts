import { seededRandom } from '../../shell/daily'

/** Beats you hear and see before the beat goes silent. */
export const LEAD = 8
/** Silent beats you keep time for. */
export const SILENT = 8

/** The day's tempo in beats per minute, the same for everyone. */
export function tempoFor(seed: string): number {
  return 80 + Math.floor(seededRandom(`beat-keeper:${seed}`)() * 11) * 5 // 80..130 in steps of 5
}
export const periodMs = (bpm: number) => 60000 / bpm

export type Result = {
  /** Each silent beat's error in ms (tap minus beat); a missed beat is null. */
  errors: (number | null)[]
  /** Mean absolute error, a missed beat (or an extra tap) counting as half a beat. */
  mean: number
  /** Whether the taps drifted ahead (fast) or behind (slow) over the run, or held steady. */
  drift: 'steady' | 'fast' | 'slow'
}

/**
 * Scores taps (ms on the same clock as `start`, the time of the first lead-in beat) against the silent beats.
 * Each silent beat takes the nearest unused tap within half a beat.
 */
export function score(taps: number[], start: number, bpm: number): Result {
  const p = periodMs(bpm)
  const used = new Set<number>()
  const errors = Array.from({ length: SILENT }, (_, k) => {
    const beat = start + (LEAD + k) * p
    let best = -1
    taps.forEach((t, i) => { if (!used.has(i) && Math.abs(t - beat) <= p / 2 && (best < 0 || Math.abs(t - beat) < Math.abs(taps[best] - beat))) best = i })
    if (best < 0) return null
    used.add(best)
    return Math.round(taps[best] - beat)
  })
  // Extra taps during the silent beats cost as much as a missed beat, so drumming fast doesn't pay.
  const from = start + (LEAD - 0.5) * p, to = start + (LEAD + SILENT - 0.5) * p
  const extras = taps.filter((t) => t >= from && t < to).length - used.size
  const mean = Math.round((errors.reduce<number>((s, e) => s + (e == null ? p / 2 : Math.abs(e)), 0) + Math.max(0, extras) * (p / 2)) / SILENT)
  // Drift: the trend of the errors across the run (least-squares slope), as ms over the whole run.
  const pts = errors.flatMap((e, k) => (e == null ? [] : [[k, e]]))
  let drift: Result['drift'] = 'steady'
  if (pts.length >= 3) {
    const n = pts.length, mx = pts.reduce((s, [x]) => s + x, 0) / n, my = pts.reduce((s, [, y]) => s + y, 0) / n
    const slope = pts.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / pts.reduce((s, [x]) => s + (x - mx) ** 2, 0)
    const over = slope * (SILENT - 1)
    if (over > 40) drift = 'slow'
    else if (over < -40) drift = 'fast'
  }
  return { errors, mean, drift }
}
