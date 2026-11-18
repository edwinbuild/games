export const RACE_MS = 60_000
export const WRONG_MS = 3_000
export const COUNTDOWN_MS = 3_000
export const MAX_PLAYERS = 8

export type Racer = { id: string; level: number; at: number; left?: boolean }
export type Placed = Racer & { place: number }

/**
 * Final order: more levels cleared first; on equal levels, whoever got there sooner
 * (ms after their own start). Exactly equal racers share a place.
 */
export function rank(racers: Racer[]): Placed[] {
  const sorted = [...racers].sort((a, b) => b.level - a.level || a.at - b.at || a.id.localeCompare(b.id))
  return sorted.map((r, i) => {
    let place = i + 1
    for (let j = i - 1; j >= 0 && sorted[j].level === r.level && sorted[j].at === r.at; j--) place = j + 1
    return { ...r, place }
  })
}

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${s}`
}

/** Time left on my clock, given when my race started and the penalties so far. */
export function timeLeft(startedAt: number, now: number, wrong: number): number {
  return Math.max(0, RACE_MS - (now - startedAt) - wrong * WRONG_MS)
}
