// Site settings from the admin page (games switched off, New and Featured, the banner, rooms,
// sign-ups, re-rolled puzzles…). Read from this device first, so nothing waits for the network;
// refreshed in the background once a minute at most.
import { useEffect, useReducer } from 'react'
import { rpc } from './api'
import { setSeedHook } from './daily'
import { load, save } from './storage'

export type Banner = { text: string; link?: string; until?: string } | null
export type SiteConfig = {
  disabled: string[]
  featured: string[]
  new: string[]
  banner: Banner
  maintenance: Banner
  rooms: boolean
  signups: boolean
  comments: 'off' | 'review' | 'on'
  autoplay: { run: boolean; replay: boolean }
  counters: { plays: number; online: number; gameOnline: number }
  /** Re-rolled daily puzzles: "garden-path:2026-11-20" → how many times. */
  rerolls: Record<string, number>
}

export const DEFAULT_CONFIG: SiteConfig = {
  disabled: [], featured: [], new: [], banner: null, maintenance: null, rooms: true, signups: true, comments: 'review',
  autoplay: { run: true, replay: true }, counters: { plays: 100, online: 5, gameOnline: 3 }, rerolls: {},
}

let current: SiteConfig = { ...DEFAULT_CONFIG, ...load<Partial<SiteConfig>>('config', {}) }
export const siteConfig = () => current
const listeners = new Set<() => void>()
export function onConfig(f: () => void): () => void {
  listeners.add(f)
  return () => listeners.delete(f)
}
/** Applies settings (from the database, or a test). */
export function setConfig(c: Partial<SiteConfig>) {
  current = { ...DEFAULT_CONFIG, ...c }
  save('config', c)
  listeners.forEach((f) => f())
}

/** The settings, redrawn when they change. */
export function useSiteConfig(): SiteConfig {
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  useEffect(() => onConfig(redraw), [])
  return current
}

/** Fresh settings from the database, at most once a minute. */
export function refreshConfig(): void {
  if (Date.now() - load<number>('config-at', 0) < 60_000) return
  save('config-at', Date.now())
  rpc<Partial<SiteConfig>>('site_config').then((c) => { if (c && typeof c === 'object') setConfig(c) }, () => {})
}

/** A banner is shown until its end time (if it has one). */
export const bannerLive = (b: Banner, now = Date.now()) => !!b?.text && (!b.until || Date.parse(b.until) > now)

/**
 * The seed a daily puzzle is made from, after any re-roll: "garden-path:2026-11-20…" becomes
 * "garden-path:2026-11-20…#r1" once the admin re-rolls Garden Path for that day.
 */
export function rerolled(key: string, rerolls = current.rerolls): string {
  for (const [k, n] of Object.entries(rerolls ?? {})) {
    const i = k.lastIndexOf(':')
    const slug = k.slice(0, i), day = k.slice(i + 1)
    if (n > 0 && key.startsWith(slug + ':') && key.includes(day)) return `${key}#r${n}`
  }
  return key
}

setSeedHook((seed) => rerolled(seed))
if (typeof window !== 'undefined') refreshConfig()
