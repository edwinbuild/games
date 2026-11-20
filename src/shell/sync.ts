// Keeps a signed-in player's progress the same on every device: stats and today's tries for each
// game are merged (best of both, never lost) with the copy in their account. Loaded only when
// signed in.
import { rpc } from './api'
import { streakEnding, type Stats } from './stats'
import { load, save } from './storage'

type Today = { date: string; value: unknown }

const better = (a: number | null, b: number | null, low?: boolean) => {
  if (a == null) return b
  if (b == null) return a
  return low ? Math.min(a, b) : Math.max(a, b)
}


/** Two copies of one game's stats as one: every day played, the better result each day, the best best. */
export function mergeStats(a: Stats, b: Stats): Stats {
  const low = a.low ?? b.low
  const daily: Stats['daily'] = { ...b.daily }
  const dailyText: Record<string, string> = { ...(b.dailyText ?? {}) }
  for (const [d, v] of Object.entries(a.daily ?? {})) {
    if (!(d in daily)) { daily[d] = v; if (a.dailyText?.[d]) dailyText[d] = a.dailyText[d]; continue }
    const pick = better(v, daily[d], low)
    if (pick !== daily[d] && pick === v) { daily[d] = v; if (a.dailyText?.[d]) dailyText[d] = a.dailyText[d] }
  }
  const lastDaily = [a.lastDaily, b.lastDaily].filter(Boolean).sort().pop() ?? null
  const run = lastDaily ? streakEnding(new Set(Object.keys(daily)), lastDaily) : { streak: 0, frozen: [] }
  const streak = run.streak
  const frozen = [...new Set([...(a.frozen ?? []), ...(b.frozen ?? []), ...run.frozen])].sort().slice(-8)
  const bestOf = better(a.best, b.best, low)
  const bestText = bestOf == null ? undefined : bestOf === a.best ? a.bestText ?? b.bestText : b.bestText ?? a.bestText
  return {
    plays: Math.max(a.plays ?? 0, b.plays ?? 0),
    best: bestOf,
    ...(bestText ? { bestText } : {}),
    lastDaily,
    streak,
    maxStreak: Math.max(a.maxStreak ?? 0, b.maxStreak ?? 0, streak),
    daily,
    ...(Object.keys(dailyText).length ? { dailyText } : {}),
    ...(low != null ? { low } : {}),
    ...(frozen.length ? { frozen } : {}),
  }
}

/** Today's tries: the newer day wins; on the same day, the copy with more tries. */
export function mergeToday(a: Today | null, b: Today | null): Today | null {
  if (!a || !b) return a ?? b
  if (a.date !== b.date) return a.date > b.date ? a : b
  const size = (t: Today) => (Array.isArray(t.value) ? t.value.length : JSON.stringify(t.value ?? null).length)
  return size(a) >= size(b) ? a : b
}

/** Every saved key this sync covers, read from this device. */
function localKeys(): string[] {
  try {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!)
      .filter((k) => /^qg:(stats|today):[a-z0-9-]+$/.test(k)).map((k) => k.slice(3))
  } catch {
    return []
  }
}

let syncing: Promise<void> | null = null
/** Pulls the account's copy, merges it with this device's, saves both. */
export function syncNow(): Promise<void> {
  syncing ??= (async () => {
    try {
      const rows = await rpc<{ key: string; value: unknown }[]>('get_data')
      const remote = new Map(rows.map((r) => [r.key, r.value]))
      const keys = new Set([...localKeys(), ...remote.keys()])
      const push: Record<string, unknown> = {}
      for (const k of keys) {
        const mine = load<unknown>(k, null), theirs = remote.get(k) ?? null
        const merged = k.startsWith('stats:')
          ? (mine && theirs ? mergeStats(mine as Stats, theirs as Stats) : mine ?? theirs)
          : mergeToday(mine as Today | null, theirs as Today | null)
        if (JSON.stringify(merged) !== JSON.stringify(mine)) save(k, merged)
        if (JSON.stringify(merged) !== JSON.stringify(theirs)) push[k] = merged
      }
      // At most 100 keys a call, so a long-time player's first sync isn't one huge request.
      const entries = Object.entries(push)
      for (let i = 0; i < entries.length; i += 100) await rpc('put_data', { p_items: Object.fromEntries(entries.slice(i, i + 100)) })
      save('synced-at', Date.now())
    } finally {
      syncing = null
    }
  })()
  return syncing
}

const pending = new Set<string>()
let timer: ReturnType<typeof setTimeout> | undefined
/** Sends changed keys a moment later (several saves in a row become one call). */
export function pushSoon(key: string): void {
  pending.add(key)
  clearTimeout(timer)
  timer = setTimeout(() => {
    const items = Object.fromEntries([...pending].map((k) => [k, load<unknown>(k, null)]).filter(([, v]) => v != null))
    pending.clear()
    if (Object.keys(items).length) rpc('put_data', { p_items: items }, { keepalive: true }).catch(() => { /* the next full sync catches up */ })
  }, 800)
}
