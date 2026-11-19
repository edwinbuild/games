// Registers the service worker (dist/sw.js, written after the build) on the live site, or when a
// test turns it on. Local development never registers it, so pages there are always fresh.
import { counting } from './api'
import { load } from './storage'

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && (counting() || load<boolean>('sw-test', false))) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* offline play is a bonus */ }) })
}
