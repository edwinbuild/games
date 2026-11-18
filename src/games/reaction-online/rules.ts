// Online reaction duel rules. Each phone times its own reaction (green shown → tap),
// so network delay never decides a round. `null` means a tap before green.
export type Result = number | null
export const TARGET = 3

/** 0 = first player wins the round, 1 = second, -1 = nobody (both early). */
export function roundWinner(a: Result, b: Result): number {
  if (a == null && b == null) return -1
  if (a == null) return 1
  if (b == null) return 0
  if (a === b) return -1
  return a < b ? 0 : 1
}

/** The host's delays for every round of a match: 1.5–4 s, so neither player can predict green. */
export function makeDelays(rand: () => number, rounds = 9): number[] {
  return Array.from({ length: rounds }, () => Math.round(1500 + rand() * 2500))
}
