// Sign-in (Supabase Auth) over plain fetch, so every page stays small: an email link now, Google
// later. The session lives in this browser's storage; the email link brings the player back to
// the page they were on with the tokens in the address, which are read here and cleared at once.
import { SITE } from '../site'
import { load, save } from './storage'

export type Session = { access: string; refresh: string; expires: number; user: { id: string; email: string } }

export const AUTH = `${SITE.api.url}/auth/v1`
const KEY = 'session'
const listeners = new Set<() => void>()

/** The user inside an access token (no check here; the server checks every call). */
export function readToken(token: string): { id: string; email: string; exp: number } | null {
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof p.sub === 'string' ? { id: p.sub, email: String(p.email ?? ''), exp: Number(p.exp) || 0 } : null
  } catch {
    return null
  }
}

export const getSession = (): Session | null => load<Session | null>(KEY, null)
export const signedIn = () => getSession() != null
export function setSession(s: Session | null) {
  save(KEY, s)
  listeners.forEach((f) => f())
}
/** Called whenever the player signs in or out. */
export function onAuthChange(f: () => void): () => void {
  listeners.add(f)
  return () => listeners.delete(f)
}

/** Sign-in results the page shows once: just signed in, or why the link didn't work. */
export type AuthNotice = { kind: 'signed-in' } | { kind: 'error'; message: string }
let notice: AuthNotice | null = null
export const takeAuthNotice = () => { const n = notice; notice = null; return n }

/** Reads an email link's result from the address (#access_token=… or #error=…), then removes it. */
export function captureRedirect(hash = typeof location !== 'undefined' ? location.hash : ''): void {
  if (!/(access_token|error_description)=/.test(hash)) return
  const p = new URLSearchParams(hash.slice(1))
  const token = p.get('access_token'), refresh = p.get('refresh_token')
  const user = token ? readToken(token) : null
  if (token && refresh && user) {
    setSession({ access: token, refresh, expires: Number(p.get('expires_at')) || user.exp, user: { id: user.id, email: user.email } })
    notice = { kind: 'signed-in' }
  } else {
    const why = p.get('error_code') === 'otp_expired' ? 'That sign-in link has expired or was already used. Send yourself a new one.' : p.get('error_description') || 'That sign-in link didn’t work. Send yourself a new one.'
    notice = { kind: 'error', message: why }
  }
  if (typeof history !== 'undefined') history.replaceState(null, '', location.pathname + location.search)
}

let refreshing: Promise<string | null> | null = null
/** A valid access token for database calls, refreshed when close to expiring; null when signed out. */
export async function accessToken(): Promise<string | null> {
  const s = getSession()
  if (!s) return null
  if (s.expires * 1000 > Date.now() + 60_000) return s.access
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SITE.api.key },
        body: JSON.stringify({ refresh_token: s.refresh }),
      })
      if (!res.ok) {
        // The session was revoked or is too old: back to guest.
        if (res.status === 400 || res.status === 401) setSession(null)
        return null
      }
      const j = await res.json()
      const user = readToken(j.access_token)
      if (!user) return null
      setSession({ access: j.access_token, refresh: j.refresh_token, expires: Number(j.expires_at) || user.exp, user: { id: user.id, email: user.email } })
      return j.access_token as string
    } catch {
      return null // offline: try again next time
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/** Asks the page's account key to open a sheet: sign in by default (from a result ticket, say). */
export const openSignIn = (detail?: { kind: string }) => window.dispatchEvent(new CustomEvent('qg:sign-in', { detail }))

captureRedirect()
