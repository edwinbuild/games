// Calls to the Supabase functions (see supabase/README.md). Plain fetch keeps the bundle small.
import { SITE } from '../site'

/** Local test runs and previews on this machine never count. */
export const counting = () => typeof location !== 'undefined' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}, opts: { keepalive?: boolean } = {}): Promise<T> {
  const res = await fetch(`${SITE.api.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    keepalive: opts.keepalive,
    headers: { 'Content-Type': 'application/json', apikey: SITE.api.key },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`${fn}: ${res.status}`)
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
