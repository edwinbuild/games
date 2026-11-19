// Per-game stats kept in the browser: plays, best score, daily streaks.
import { dateKey, previousDateKey } from './daily'
import { load, save } from './storage'

export type Stats = {
  plays: number
  best: number | null
  /** For daily games: the last date a daily result was recorded. */
  lastDaily: string | null
  streak: number
  maxStreak: number
  /** Daily results by date, e.g. { "2027-01-04": 0.04 }. */
  daily: Record<string, number>
  /** Short display text of the best score ("243ms", "Lv 7"), shown on the home card. */
  bestText?: string
  /** Short display text of each daily result, by date. */
  dailyText?: Record<string, string>
}

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
  if (s.best != null && better(score, s.best)) newBests.add(game)
  if (s.best == null || better(score, s.best)) {
    s.best = score
    if (text) s.bestText = text
  }
  save(`stats:${game}`, s)
  return s
}

/** Record today's daily result and advance the streak (once per day). */
export function recordDaily(game: string, score: number, now = new Date(), text?: string, lowerIsBetter = false): Stats {
  const s = getStats(game)
  const today = dateKey(now)
  const beats = (a: number, b: number) => (lowerIsBetter ? a < b : a > b)
  const earlier = Object.entries(s.daily).filter(([d]) => d !== today).map(([, v]) => v)
  const before = earlier.length ? earlier.reduce((a, b) => (beats(a, b) ? a : b)) : null
  if (before != null && beats(score, before) && (s.daily[today] == null || beats(score, s.daily[today]))) newBests.add(game)
  if (s.lastDaily !== today) {
    s.streak = s.lastDaily === previousDateKey(now) ? s.streak + 1 : 1
    s.maxStreak = Math.max(s.maxStreak, s.streak)
    s.lastDaily = today
  }
  s.daily[today] = score
  if (text) s.dailyText = { ...s.dailyText, [today]: text }
  save(`stats:${game}`, s)
  return s
}

/** Today's daily result as display text, if played. */
export function todaysDailyText(game: string, now = new Date()): string | undefined {
  return getStats(game).dailyText?.[dateKey(now)]
}

export function todaysDaily(game: string, now = new Date()): number | undefined {
  return getStats(game).daily[dateKey(now)]
}

/** Free-form per-game state for today (e.g. attempts used). Resets each day. */
export function loadToday<T>(game: string, fallback: T, now = new Date()): T {
  const v = load<{ date: string; value: T } | null>(`today:${game}`, null)
  return v && v.date === dateKey(now) ? v.value : fallback
}

export function saveToday(game: string, value: unknown, now = new Date()): void {
  save(`today:${game}`, { date: dateKey(now), value })
}
