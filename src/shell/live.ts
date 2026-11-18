// Finished games in the last 24 hours, per game. Cached for a few minutes per tab.
import { useEffect, useState } from 'react'
import { rpc } from './api'

const KEY = 'qg:recent'
const FRESH_MS = 5 * 60_000
/** Below this, a count reads as empty rather than lively, so it isn't shown. */
export const SHOW_FROM = 25

async function fetchRecent(): Promise<Record<string, number>> {
  try {
    const cached = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { at: number; data: Record<string, number> } | null
    if (cached && Date.now() - cached.at < FRESH_MS) return cached.data
  } catch {
    /* storage unavailable */
  }
  const rows = await rpc<{ game: string; plays: number }[]>('recent_plays')
  const data = Object.fromEntries(rows.map((r) => [r.game, Number(r.plays)]))
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* storage unavailable */
  }
  return data
}

/** Plays in the last 24 hours, or null until loaded (or if the request fails). */
export function useRecentPlays(): Record<string, number> | null {
  const [data, setData] = useState<Record<string, number> | null>(null)
  useEffect(() => {
    let alive = true
    fetchRecent().then((d) => alive && setData(d), () => {})
    return () => {
      alive = false
    }
  }, [])
  return data
}

export const formatCount = (n: number) => n.toLocaleString('en-US')
