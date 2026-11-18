// Game events: started, finished, shared, played next. They become hourly counts per game
// in Supabase (no personal data) and feed the plan's decision rules: finish rate and share rate.
import { counting, rpc } from './api'

export type GameEvent = 'start' | 'finish' | 'share' | 'play_next'

export function track(event: GameEvent, game: string, data: Record<string, string | number> = {}): void {
  if (import.meta.env.DEV) console.debug('[track]', { event, game, ...data })
  if (!counting()) return
  rpc('log_event', { p_game: game, p_event: event }, { keepalive: true }).catch(() => {
    /* never break a game over counting */
  })
}
