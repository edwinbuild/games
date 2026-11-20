// The account key in every top bar: "Sign in" for guests, the player's icon (to their profile)
// when signed in. The sheets, icons and sync load only when needed, so every page stays small.
import { lazy, Suspense, useEffect, useReducer, useState } from 'react'
import { captureRedirect, onAuthChange, signedIn, takeAuthNotice } from './auth'
import type { SheetMode } from './AccountSheets'
import { load } from './storage'

const AccountSheets = lazy(() => import('./AccountSheets'))
const Avatar = lazy(() => import('../ui/icons').then((m) => ({ default: m.Avatar })))
type Cached = { username: string | null; icon: string; colour: string; incoming: number } | null
const SYNC_EVERY = 10 * 60_000

export function AccountKey() {
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const [sheet, setSheet] = useState<SheetMode | null>(null)
  const me = signedIn()
  const profile = me ? load<Cached>('profile', null) : null

  useEffect(() => {
    const offAuth = onAuthChange(redraw)
    const open = (e: Event) => setSheet((e as CustomEvent).detail ?? { kind: 'sign-in' })
    window.addEventListener('qg:sign-in', open)
    window.addEventListener('qg:profile', redraw)
    // Back from an email link: finish signing in; or say why the link didn't work. (Also when the
    // link opens in a tab already on this page, which only changes the address's # part.)
    const fromLink = () => {
      const n = takeAuthNotice()
      if (n) setSheet(n.kind === 'signed-in' ? { kind: 'welcome' } : { kind: 'sign-in', error: n.message })
      return !!n
    }
    const onHash = () => { captureRedirect(); fromLink() }
    window.addEventListener('hashchange', onHash)
    if (fromLink()) { /* handled */ }
    // Signed in from before: refresh the profile and sync now and then.
    else if (signedIn() && Date.now() - load<number>('synced-at', 0) > SYNC_EVERY) {
      void import('./sync').then((m) => m.syncNow()).catch(() => {})
      void import('./account').then((m) => m.refreshProfile()).then((p) => { if (!p.username) setSheet({ kind: 'username' }) }, () => {})
    }
    return () => { offAuth(); window.removeEventListener('qg:sign-in', open); window.removeEventListener('qg:profile', redraw); window.removeEventListener('hashchange', onHash) }
  }, [])

  return (
    <>
      {me ? (
        <a className="qg-account" href="/me/" aria-label={profile?.username ? `Your profile, ${profile.username}${profile.incoming ? `, ${profile.incoming} friend requests` : ''}` : 'Your profile'}>
          <Suspense fallback={<span className="qg-account-dot" style={{ background: `var(--${profile?.colour ?? 'mint'})` }} />}>
            <Avatar icon={profile?.icon} colour={profile?.colour} size={34} />
          </Suspense>
          {!!profile?.incoming && <span className="qg-account-badge" aria-hidden="true">{profile.incoming}</span>}
        </a>
      ) : (
        <button type="button" className="qg-signin-key" aria-label="Sign in" onClick={() => setSheet({ kind: 'sign-in' })}>
          <svg className="qg-signin-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          <span className="qg-signin-text">Sign in</span>
        </button>
      )}
      {sheet && (
        <Suspense fallback={null}>
          <AccountSheets mode={sheet} onClose={() => setSheet(null)} />
        </Suspense>
      )}
    </>
  )
}
