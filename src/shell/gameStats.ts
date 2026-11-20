// Plays (all time), likes and players online, for cards and game pages. Read from this device
// first and refreshed at most every two minutes; shown only above the admin's thresholds.
import { useEffect, useState } from 'react'
import { rpc } from './api'
import { load, save } from './storage'

/** `live`: the database has votes and comments (false hides them; undefined: not known yet, shown). */
export type GameStats = { plays: Record<string, number>; likes: Record<string, { pct: number; n: number }>; online: number; onlineByGame: Record<string, number>; live?: boolean }
const EMPTY: GameStats = { plays: {}, likes: {}, online: 0, onlineByGame: {}, live: false }
let inflight: Promise<GameStats> | null = null

export const statsStale = () => Date.now() - load<number>('game-stats-at', 0) >= 120_000
/** Keeps fresh numbers from the database. Anything unexpected (an outage, an old database) counts as no numbers. */
export function acceptStats(x: unknown): GameStats {
  const ok: GameStats = x && typeof x === 'object' && 'plays' in x ? { ...EMPTY, ...(x as GameStats), live: true } : EMPTY
  save('game-stats', ok); save('game-stats-at', Date.now())
  return ok
}
/** Set by the settings refresh when it fetched the numbers too (one call for both). */
let shared: Promise<GameStats> | null = null
export const shareStats = (p: Promise<GameStats>) => { shared = p; p.finally(() => { if (shared === p) shared = null }).catch(() => {}) }

export function useGameStats(): GameStats {
  const [s, setS] = useState<GameStats>(() => ({ ...EMPTY, live: undefined, ...load<Partial<GameStats>>('game-stats', {}) }))
  useEffect(() => {
    if (shared) { shared.then(setS, () => {}); return }
    if (!statsStale()) return
    inflight ??= rpc<GameStats>('game_stats').then(acceptStats)
    inflight.then(setS, () => { save('game-stats', EMPTY); setS(EMPTY) }).finally(() => { inflight = null })
  }, [])
  return s
}

/** "1.2k" for 1,234. */
export const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}m` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n))

/** The line under a game's name: "92% liked · 1.2k plays", each part only past its threshold. */
export function gameLine(slug: string, s: GameStats, minPlays: number): string {
  const parts: string[] = []
  const l = s.likes[slug]
  if (l && l.n >= 20) parts.push(`${l.pct}% liked`)
  const p = s.plays[slug] ?? 0
  if (p >= minPlays) parts.push(`${compact(p)} plays`)
  return parts.join(' · ')
}
