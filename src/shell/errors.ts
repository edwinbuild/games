// Browser errors, counted on the live site: the page and the first line of the message, nothing
// else (no device, no stack, no address). At most five different messages per page load.
import { counting, rpc } from './api'
import { load } from './storage'

/** The page an error happened on: "home", "about", "category" or a game's slug. */
export function pageFor(path: string): string {
  const first = path.split('/').filter(Boolean)[0] ?? ''
  return first === '' ? 'home' : first === 'c' ? 'category' : first
}

/** Shortens a message to what's stored: its first line, up to 160 characters. */
export const firstLine = (m: string) => m.split('\n')[0].trim().slice(0, 160)

const seen = new Set<string>()
export function reportError(message: string): void {
  // Tests turn reporting on (with a stand-in function) the same way boards are turned on.
  if (!(counting() || load<boolean>('error-test', false))) return
  const m = firstLine(message)
  if (!m || seen.has(m) || seen.size >= 5) return
  seen.add(m)
  rpc('log_error', { p_page: pageFor(location.pathname), p_message: m }, { keepalive: true }).catch(() => { /* never loop on errors */ })
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => reportError(e.message || 'Unknown error'))
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | undefined
    reportError(`Unhandled: ${r?.message ?? String(e.reason)}`)
  })
}
