// Calls to the Supabase functions (see supabase/README.md). Plain fetch keeps the bundle small.
import { SITE } from '../site'
import { accessToken } from './auth'

/** Local test runs and previews on this machine never count. */
export const counting = () => typeof location !== 'undefined' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}, opts: { keepalive?: boolean } = {}): Promise<T> {
  // Signed in, calls carry the player's token, so the database knows who's asking.
  const token = await accessToken()
  const res = await fetch(`${SITE.api.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    keepalive: opts.keepalive,
    headers: { 'Content-Type': 'application/json', apikey: SITE.api.key, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    // The database's own message (e.g. "username taken") when there is one.
    const j = await res.json().catch(() => null) as { message?: string } | null
    throw new Error(j?.message || `${fn}: ${res.status}`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
