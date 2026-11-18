// Game events: started, finished, shared. These are what the plan's
// decision rules use (finish rate, share rate).
//
// Cloudflare Web Analytics counts page views but has no custom events, so
// events are sent to /api/event when VITE_EVENTS_ENDPOINT is set (a tiny
// Worker can count them in D1 later). Until then they only go to the console
// in development.
export type GameEvent = 'start' | 'finish' | 'share' | 'play_next'

const endpoint = import.meta.env.VITE_EVENTS_ENDPOINT as string | undefined

export function track(event: GameEvent, game: string, data: Record<string, string | number> = {}): void {
  const payload = { event, game, ...data, t: Date.now() }
  if (import.meta.env.DEV) console.debug('[track]', payload)
  if (!endpoint) return
  try {
    navigator.sendBeacon(endpoint, JSON.stringify(payload))
  } catch {
    /* never break a game over analytics */
  }
}
