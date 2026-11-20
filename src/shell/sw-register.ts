// Registers the service worker (dist/sw.js, written after the build) on the live site, or when a
// test turns it on. Local development never registers it, so pages there are always fresh.
import { counting } from './api'
import { load } from './storage'

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && (counting() || load<boolean>('sw-test', false))) {
  // It downloads the offline games (a few hundred KB), so it waits until the page has settled and the
  // browser is idle: on a slow connection that download would otherwise compete with the next tap.
  // A page that already has it (a returning visitor) is unaffected: registering again is free.
  const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* offline play is a bonus */ }) }
  const later = () => setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(register, { timeout: 10_000 }) : register()), navigator.serviceWorker.controller ? 0 : 6000)
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later)
}
