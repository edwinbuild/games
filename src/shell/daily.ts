// Daily puzzles: everyone gets the same puzzle on the same local date.

/** Puzzle #1 is on this date. */
const EPOCH = Date.UTC(2027, 0, 1)
const DAY_MS = 86_400_000

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Days since EPOCH, by local calendar date (1 = launch day). */
export function dayNumber(d = new Date()): number {
  const local = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.floor((local - EPOCH) / DAY_MS) + 1
}

/** The key for the day before the given date. */
export function previousDateKey(d = new Date()): string {
  const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
  return dateKey(prev)
}

/** Milliseconds until local midnight. */
export function msUntilTomorrow(d = new Date()): number {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  return next.getTime() - d.getTime()
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32: small, fast, good enough for game puzzles. Returns floats in [0, 1). */
/** Turns a puzzle's seed into the one actually used (the site settings add re-rolls; see config.ts). */
let seedHook = (seed: string) => seed
export const setSeedHook = (f: (seed: string) => string) => { seedHook = f }

export function seededRandom(seed: string): () => number {
  let a = hashString(seedHook(seed))
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random generator for a game's puzzle on a given day. */
export function dailyRandom(game: string, d = new Date()): () => number {
  return seededRandom(`${game}:${dateKey(d)}`)
}

/** Label for today's puzzle: "#12" after launch, the date before it. */
export function puzzleLabel(d = new Date()): string {
  const n = dayNumber(d)
  return n >= 1 ? `#${n}` : dateKey(d)
}

/** Parses a YYYY-MM-DD key back to a local date, or null if it isn't one. */
export function parseDateKey(k: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k)
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return dateKey(d) === k ? d : null
}

/** The day a daily game should show: today, or the day of a challenge from another date. */
export function dailyDayFor(challengeSeed: string | undefined): { day: Date; oneOff: boolean } {
  const parsed = challengeSeed ? parseDateKey(challengeSeed) : null
  if (!parsed || challengeSeed === dateKey()) return { day: new Date(), oneOff: false }
  return { day: parsed, oneOff: true }
}
