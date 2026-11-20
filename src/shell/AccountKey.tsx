// The account key in every top bar: "Sign in" for guests, the player's icon (to their profile)
// when signed in. The sheets, icons and sync load only when needed, so every page stays small.
import { lazy, Suspense, useEffect, useReducer, useState } from 'react'
import { captureRedirect, onAuthChange, signedIn, takeAuthNotice } from './auth'
import type { SheetMode } from './AccountSheets'
import { load } from './storage'
import { SignInKey } from '../ui/SignInKey'
import { VERSION } from '../versions'

const AccountSheets = lazy(() => import('./AccountSheets'))
const Avatar = lazy(() => import('../ui/icons').then((m) => ({ default: m.Avatar })))
type Cached = { username: string | null; icon: string; colour: string; incoming: number; news?: number } | null
const SYNC_EVERY = 10 * 60_000

export function AccountKey() {
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const [sheet, setSheet] = useState<SheetMode | null>(null)
  const me = signedIn()
  const profile = me ? load<Cached>('profile', null) : null
  const badge = (profile?.incoming ?? 0) + (profile?.news ?? 0)

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
      {/* The site's version, in the top-right corner (above the buttons); it opens what's new. */}
      <a className="site-version" href="/about/#versions" aria-label={`Version ${VERSION}: what’s new`}>v{VERSION}</a>
      {me ? (
        <a className="qg-account" href="/me/" aria-label={profile?.username ? `Your profile, ${profile.username}${badge ? `, ${badge} new` : ''}` : 'Your profile'}>
          <Suspense fallback={<span className="qg-account-dot" style={{ background: `var(--${profile?.colour ?? 'mint'})` }} />}>
            <Avatar icon={profile?.icon} colour={profile?.colour} size={34} />
          </Suspense>
          {badge > 0 && <span className="qg-account-badge" aria-hidden="true">{badge}</span>}
        </a>
      ) : (
        <SignInKey onClick={() => setSheet({ kind: 'sign-in' })} />
      )}
      {sheet && (
        <Suspense fallback={null}>
          <AccountSheets mode={sheet} onClose={() => setSheet(null)} />
        </Suspense>
      )}
    </>
  )
}
