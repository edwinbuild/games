export const ROUNDS = 5
/** A tap before green, or a guess, counts as this many ms in the average. */
export const PENALTY = 500
/** A run needs this many clean taps (of five) to count as a result. */
export const MIN_CLEAN = 3

export type Tap = { ms: number; early: boolean }
export type Summary = { avg: number; clean: number; fastest: number | null; counts: boolean }

/** The run's average (penalties included), how many taps were clean, the fastest clean tap, and whether it counts. */
export function summarize(taps: Tap[]): Summary {
  const avg = taps.length ? Math.round(taps.reduce((s, t) => s + (t.early ? PENALTY : t.ms), 0) / taps.length) : 0
  const cleanTaps = taps.filter((t) => !t.early)
  return {
    avg,
    clean: cleanTaps.length,
    fastest: cleanTaps.length ? Math.min(...cleanTaps.map((t) => t.ms)) : null,
    counts: cleanTaps.length >= MIN_CLEAN,
  }
}
