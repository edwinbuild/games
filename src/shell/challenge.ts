// Challenge links: the puzzle seed and everyone's scores travel inside the link,
// so friends can compete on the exact same puzzle without any server.
import { load, save } from './storage'

export type Row = {
  /** Nickname; empty means anonymous ("A friend"). */
  n: string
  /** Short random id per browser, so anonymous players don't overwrite each other. */
  i: string
  /** Score as a number, for ranking. */
  x: number
  /** Score as the game shows it ("0.04s", "243 ms"). */
  t: string
}
export type Challenge = { g: string; s: string; r: Row[] }

export const MAX_ROWS = 8
const MAX_NAME = 16

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function encodeChallenge(c: Challenge): string {
  return toBase64Url(JSON.stringify(c))
}

/** Parses a challenge, dropping anything malformed. Links are written by other people. */
export function decodeChallenge(s: string): Challenge | null {
  try {
    const v = JSON.parse(fromBase64Url(s)) as Partial<Challenge>
    if (typeof v.g !== 'string' || typeof v.s !== 'string' || !Array.isArray(v.r)) return null
    if (!/^[a-z0-9-]{1,40}$/.test(v.g) || v.s.length > 40) return null
    const rows = v.r
      .filter(
        (r): r is Row =>
          !!r && typeof r.n === 'string' && typeof r.i === 'string' && typeof r.x === 'number' && Number.isFinite(r.x) && typeof r.t === 'string',
      )
      .slice(0, MAX_ROWS)
      .map((r) => ({ n: cleanName(r.n), i: r.i.slice(0, 8), x: r.x, t: r.t.slice(0, 16) }))
    return { g: v.g, s: v.s, r: rows }
  } catch {
    return null
  }
}

export function cleanName(n: string): string {
  return n.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, MAX_NAME)
}

/** The challenge in this page's link, if it is for this game. */
export function readChallenge(game: string): Challenge | null {
  if (typeof location === 'undefined') return null
  const raw = new URLSearchParams(location.search).get('c')
  if (!raw) return null
  const c = decodeChallenge(raw)
  return c && c.g === game ? c : null
}

/** Adds or updates `me`, keeps the best MAX_ROWS rows, best first. */
export function mergeRow(rows: Row[], me: Row, lowerIsBetter: boolean): Row[] {
  const better = (a: number, b: number) => (lowerIsBetter ? a < b : a > b)
  const existing = rows.find((r) => r.i === me.i)
  const kept = rows.filter((r) => r.i !== me.i)
  const mine = existing && !better(me.x, existing.x) ? { ...existing, n: me.n } : me
  return [...kept, mine].sort((a, b) => (lowerIsBetter ? a.x - b.x : b.x - a.x)).slice(0, MAX_ROWS)
}

export function challengeUrl(origin: string, c: Challenge): string {
  return `${origin}/${c.g}/?c=${encodeChallenge(c)}`
}

/** This browser's short id and optional nickname. */
export function myId(): string {
  let id = load<string>('id', '')
  if (!id) {
    id = Math.random().toString(36).slice(2, 8)
    save('id', id)
  }
  return id
}
export const myName = () => load<string>('nick', '')
export const setMyName = (n: string) => save('nick', cleanName(n))

export const displayName = (r: Row, me: string) => (r.i === me ? 'You' : r.n || 'A friend')

/** A fresh random seed for score games (not daily ones). */
export const newSeed = () => Math.random().toString(36).slice(2, 10)
