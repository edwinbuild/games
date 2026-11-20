// Sign-in actions, loaded with the account screens (the shared session code is in auth.ts).
import { SITE } from '../site'
import { AUTH, getSession, setSession } from './auth'
import { save } from './storage'
import { siteConfig } from './config'

/** Emails a sign-in link that brings the player back to `back` (this page by default). */
export async function sendSignInLink(email: string, back = location.origin + location.pathname): Promise<void> {
  const res = await fetch(`${AUTH}/otp?redirect_to=${encodeURIComponent(back)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SITE.api.key },
    body: JSON.stringify({ email: email.trim(), create_user: siteConfig().signups }),
  })
  if (res.ok) return
  if (!siteConfig().signups && (res.status === 400 || res.status === 422)) throw new Error('New sign-ups are paused for now. Players who already have an account can still sign in.')
  if (res.status === 429) throw new Error('Too many sign-in emails just now. Wait a few minutes and try again.')
  const j = await res.json().catch(() => ({}))
  throw new Error(/email/i.test(j.msg ?? j.error_description ?? '') ? 'Check the email address and try again.' : 'Couldn’t send the email. Try again in a minute.')
}

/** Signs out on this device: back to guest. Saved progress stays on the device. */
export async function signOut(): Promise<void> {
  const token = getSession()?.access
  setSession(null)
  save('profile', null)
  if (token) await fetch(`${AUTH}/logout?scope=local`, { method: 'POST', headers: { apikey: SITE.api.key, Authorization: `Bearer ${token}` } }).catch(() => {})
}

