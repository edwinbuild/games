// Rules shared by same-phone duels, kept pure so they can be unit-tested.

/** Taps this soon after "go" are ignored: too fast to be a reaction (often a double-tap). */
export const GRACE_MS = 80
/** Two valid taps closer than this are a tie and the round is replayed. */
export const TIE_MS = 10

export type Press = { player: number; t: number }
export type RoundOutcome = { kind: 'win'; winner: number; ms: number } | { kind: 'early'; loser: number } | { kind: 'tie' }

/** Decides a round from the presses seen so far. `goAt` is null while the stage still says "Wait". */
export function judgeRound(presses: Press[], goAt: number | null): RoundOutcome | 'pending' {
  if (goAt == null) {
    const early = presses[0]
    return early ? { kind: 'early', loser: early.player } : 'pending'
  }
  const early = presses.find((p) => p.t < goAt)
  if (early) return { kind: 'early', loser: early.player }
  const valid = presses.filter((p) => p.t - goAt >= GRACE_MS).sort((a, b) => a.t - b.t)
  if (!valid.length) return 'pending'
  const [first, second] = valid
  if (second && second.player !== first.player && second.t - first.t < TIE_MS) return { kind: 'tie' }
  return { kind: 'win', winner: first.player, ms: Math.round(first.t - goAt) }
}

/** First to `target` wins the match. */
export function matchWinner(scores: number[], target = 3): number | null {
  const i = scores.findIndex((s) => s >= target)
  return i >= 0 ? i : null
}
