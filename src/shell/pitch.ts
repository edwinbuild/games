// Pitch ladders for sounds that climb as a streak or chain grows. Pure, so they can be tested.

/** A pop for the nth item in a chain (0-based): one semitone higher each time, capped at two octaves. */
export function popHz(n: number): number {
  return 330 * 2 ** (Math.min(Math.max(0, n), 24) / 12)
}

/** Major-pentatonic steps, so a long run of chimes always sounds musical. */
const PENTA = [0, 2, 4, 7, 9]
/** A chime for the nth success in a row (0-based), climbing a pentatonic scale for two octaves. */
export function chimeHz(n: number): number {
  const k = Math.min(Math.max(0, n), 10)
  return 523.25 * 2 ** ((Math.floor(k / 5) * 12 + PENTA[k % 5]) / 12)
}
