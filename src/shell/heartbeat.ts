// "Still here", once a minute while the page is open and showing: a random id for this tab and the
// game being played, nothing else. Counted for "playing now" (kept three minutes).
import { counting, rpc } from './api'
import { load } from './storage'

function tabId(): string {
  try {
    let id = sessionStorage.getItem('qg:tab')
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-4); sessionStorage.setItem('qg:tab', id) }
    return id
  } catch {
    return Math.random().toString(36).slice(2, 16).padEnd(14, '0')
  }
}

if (typeof window !== 'undefined' && (counting() || load<boolean>('online-test', false))) {
  const beat = () => { if (document.visibilityState === 'visible') rpc('heartbeat', { p_tab: tabId(), p_game: document.body.dataset.game ?? null }, { keepalive: true }).catch(() => {}) }
  setTimeout(beat, 1500)
  setInterval(beat, 60_000)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') beat() })
}
