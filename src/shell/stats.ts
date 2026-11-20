// Per-game stats kept in the browser: plays, best score, daily streaks.
import { dateKey, parseDateKey, previousDateKey } from './daily'
import { signedIn } from './auth'
import { load, save } from './storage'

export type Stats = {
  plays: number
  best: number | null
  /** For daily games: the last date a daily result was recorded. */
  lastDaily: string | null
  streak: number
  maxStreak: number
  /** Daily results by date, e.g. { "2027-01-04": 0.04 }; null means played but no score yet (a spill). */
  daily: Record<string, number | null>
  /** Short display text of the best score ("243ms", "Lv 7"), shown on the home card. */
  bestText?: string
  /** Short display text of each daily result, by date. */
  dailyText?: Record<string, string>
  /** Whether a lower score is better (kept so two devices' results can be merged). */
  low?: boolean
  /** Missed days a streak freeze covered (❄️): at most one a week. */
  frozen?: string[]
}

/** Days from date key `a` to date key `b` (b later is positive). */
const daysBetween = (a: string, b: string) => Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 86_400_000)
const ymd = (k: string): [number, number, number] => { const [y, m, d] = k.split('-').map(Number); return [y, m - 1, d] }

/** A streak freeze can cover `day` if no other freeze is within a week of it. */
export const canFreeze = (frozen: string[] | undefined, day: string) => !(frozen ?? []).some((f) => f !== day && Math.abs(daysBetween(f, day)) < 7)

/**
 * The streak ending on `last`: days played in a row, where a single missed day is bridged by a
 * freeze, one a week at most. Returns the length (played days only) and the days frozen.
 */
export function streakEnding(played: Set<string>, last: string): { streak: number; frozen: string[] } {
  let n = 0
  const frozen: string[] = []
  for (let d: string | null = last; d; ) {
    if (played.has(d)) { n++; d = prev(d); continue }
    const before = prev(d)
    if (n > 0 && before && played.has(before) && canFreeze(frozen, d)) { frozen.push(d); d = before; continue }
    break
  }
  return { streak: n, frozen }
}
const prev = (k: string) => { const d = parseDateKey(k); return d ? previousDateKey(d) : null }

// Games whose latest result was saved by a streak freeze (read once by the ticket).
const freezes = new Set<string>()
export const takeFreeze = (game: string) => freezes.delete(game)

// Games whose latest recorded result beat the player's earlier best (read once by the ticket).
const newBests = new Set<string>()
/** True once after a result that beat an earlier best (never on the very first result). */
export function takeNewBest(game: string): boolean {
  return newBests.delete(game)
}

const empty = (): Stats => ({ plays: 0, best: null, lastDaily: null, streak: 0, maxStreak: 0, daily: {} })

export function getStats(game: string): Stats {
  return { ...empty(), ...load<Partial<Stats>>(`stats:${game}`, {}) }
}

/** Record a finished play. `better` decides whether a score beats the best. */
export function recordPlay(
  game: string,
  score: number,
  better: (a: number, b: number) => boolean = (a, b) => a > b,
  text?: string,
): Stats {
  const s = getStats(game)
  s.plays += 1
  s.low = better(1, 2)
  if (s.best != null && better(score, s.best)) newBests.add(game)
  if (s.best == null || better(score, s.best)) {
    s.best = score
    if (text) s.bestText = text
  }
  save(`stats:${game}`, s)
  changed(`stats:${game}`)
  return s
}

/** Count a play that has no score: a finished match, or a run that didn't qualify for a result. */
export function countPlay(game: string): Stats {
  const s = getStats(game)
  s.plays += 1
  save(`stats:${game}`, s)
  changed(`stats:${game}`)
  return s
}

/** Record today's daily result and advance the streak (once per day). */
/**
 * Record today's daily result. `score` null marks the day as played without a score (every try
 * spilled, or a crowd answer still waiting for the crowd): the streak counts, bests are untouched.
 */
export function recordDaily(game: string, score: number | null, now = new Date(), text?: string, lowerIsBetter = false): Stats {
  const s = getStats(game)
  s.low = lowerIsBetter
  const today = dateKey(now)
  const beats = (a: number, b: number) => (lowerIsBetter ? a < b : a > b)
  const earlier = Object.entries(s.daily).filter(([d, v]) => d !== today && v != null).map(([, v]) => v as number)
  const before = earlier.length ? earlier.reduce((a, b) => (beats(a, b) ? a : b)) : null
  const current = s.daily[today] ?? null
  if (score != null && before != null && beats(score, before) && (current == null || beats(score, current))) newBests.add(game)
  if (s.lastDaily !== today) {
    const yesterday = previousDateKey(now)
    const dayBefore = previousDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
    if (s.lastDaily === yesterday) s.streak += 1
    else if (s.lastDaily === dayBefore && s.streak > 0 && canFreeze(s.frozen, yesterday)) {
      s.streak += 1
      s.frozen = [...(s.frozen ?? []), yesterday].slice(-8)
      freezes.add(game)
    } else s.streak = 1
    s.maxStreak = Math.max(s.maxStreak, s.streak)
    s.lastDaily = today
  }
  // A day without a score never overwrites one that has a score.
  if (score != null || current == null) {
    s.daily[today] = score
    if (text) s.dailyText = { ...s.dailyText, [today]: text }
  }
  save(`stats:${game}`, s)
  changed(`stats:${game}`)
  return s
}

/** Today's daily result as display text, if played. */
export function todaysDailyText(game: string, now = new Date()): string | undefined {
  return getStats(game).dailyText?.[dateKey(now)]
}

/** Today's daily result: undefined if not played today, null if played without a score. */
export function todaysDaily(game: string, now = new Date()): number | null | undefined {
  return getStats(game).daily[dateKey(now)]
}

/** Free-form per-game state for today (e.g. attempts used). Resets each day. */
export function loadToday<T>(game: string, fallback: T, now = new Date()): T {
  const v = load<{ date: string; value: T } | null>(`today:${game}`, null)
  return v && v.date === dateKey(now) ? v.value : fallback
}

export function saveToday(game: string, value: unknown, now = new Date()): void {
  save(`today:${game}`, { date: dateKey(now), value })
  changed(`today:${game}`)
}

/** Signed in, saved progress also goes to the account (the sync code loads only then). */
function changed(key: string) {
  if (signedIn()) void import('./sync').then((m) => m.pushSoon(key)).catch(() => {})
}
