// Auto play: "today's run" (the day's puzzles one after another, started from home) and auto
// replay for arcade games. Both can be switched off by the player (profile) or the admin.
import { siteConfig } from './config'
import { load, save } from './storage'

export type AutoPrefs = { run: boolean; replay: boolean }
export const autoPrefs = (): AutoPrefs => ({ run: true, replay: true, ...load<Partial<AutoPrefs>>('autoplay', {}) })
export const setAutoPrefs = (p: AutoPrefs) => save('autoplay', p)

/** Any-time solo games that are quick to replay. */
export const ARCADE = new Set(['reaction-chain', 'odd-one-out', 'memory-path', 'angle-eye', 'tidy-up', 'pendulum-stop', 'orbit-drop', 'stick-up'])
export const replayOn = (slug: string) => ARCADE.has(slug) && autoPrefs().replay && siteConfig().autoplay.replay

/** Today's run: the games still to play, kept for this tab. */
type Run = { games: string[]; day: string }
const read = (): Run | null => { try { return JSON.parse(sessionStorage.getItem('qg:run') ?? 'null') } catch { return null } }
const write = (r: Run | null) => { try { if (r) sessionStorage.setItem('qg:run', JSON.stringify(r)); else sessionStorage.removeItem('qg:run') } catch { /* storage off */ } }

export const runOn = () => autoPrefs().run && siteConfig().autoplay.run
export function startRun(games: string[], day: string): string | null {
  if (!games.length) return null
  write({ games, day })
  return games[0]
}
/** In a run, after `slug`: the next game, how far along (1-based) and how many in all. */
export function nextInRun(slug: string, day: string): { next: string | null; at: number; of: number } | null {
  const r = read()
  if (!r || r.day !== day || !r.games.includes(slug)) return null
  const i = r.games.indexOf(slug)
  return { next: r.games[i + 1] ?? null, at: i + 1, of: r.games.length }
}
export const stopRun = () => write(null)
