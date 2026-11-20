// The profile page (/me/): your icon and username, streaks and bests for every game, icons to
// earn, friends, and the account itself (sign out, download, delete). Guests see their progress
// on this device and how to sign in.
import { lazy, StrictMode, Suspense, useEffect, useReducer, useState } from 'react'
import { LISTED } from '../games/registry'
import { SITE } from '../site'
import { cachedProfile, deleteAccount, refreshProfile, type Profile } from '../shell/account'
import { getSession, onAuthChange, openSignIn, signedIn } from '../shell/auth'
import { signOut } from '../shell/auth-actions'
import { AccountKey } from '../shell/AccountKey'
import { SiteNotice } from '../shell/SiteNotice'
import { rpc } from '../shell/api'
import { mount, ready } from '../shell/mount'
import { SiteFooter } from '../shell/SiteFooter'
import { getStats, todaysDailyText } from '../shell/stats'
import { syncNow } from '../shell/sync'
import { Button, TextField, TopBar } from '../ui'
import { Avatar, EARNED_ICONS } from '../ui/icons'
import { Sheet } from '../ui/Sheet'
import '../shell/styles'
import '../shell/errors'
import '../shell/sw-register'

const Friends = lazy(() => import('../shell/Friends'))
const UsernameForm = lazy(() => import('../shell/AccountSheets').then((m) => ({ default: m.UsernameForm })))
const IconPicker = lazy(() => import('../shell/AccountSheets').then((m) => ({ default: m.IconPicker })))

function Me() {
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const [p, setP] = useState<Profile | null>(cachedProfile)
  const [sheet, setSheet] = useState<'username' | 'icon' | 'delete' | null>(null)
  const me = signedIn()

  useEffect(() => {
    const off = onAuthChange(redraw)
    const onProfile = () => setP(cachedProfile())
    window.addEventListener('qg:profile', onProfile)
    if (signedIn()) {
      refreshProfile().then(setP, () => {})
      syncNow().then(redraw, () => {})
    }
    return () => { off(); window.removeEventListener('qg:profile', onProfile) }
  }, [])

  const played = LISTED.map((g) => ({ g, s: getStats(g.slug) })).filter(({ s }) => s.plays > 0 || Object.keys(s.daily ?? {}).length > 0)
  const longest = Math.max(0, ...played.map(({ s }) => s.maxStreak ?? 0))
  const unlocked = new Set(p?.unlocked ?? [])

  return (
    <div className="page">
      <TopBar siteName={SITE.name} right={<AccountKey />} />
      <SiteNotice />
      <main className="me">
        {me ? (
          <section className="me-head">
            <button type="button" className="me-avatar" onClick={() => setSheet('icon')} aria-label="Change your icon">
              <Avatar icon={p?.icon} colour={p?.colour} size={88} />
            </button>
            <div className="stack" style={{ gap: 4 }}>
              <h1 className="game-title" style={{ margin: 0 }}>{p?.username ?? 'Your profile'}</h1>
              <p className="small muted" style={{ margin: 0 }}>Signed in as {getSession()?.user.email}</p>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => setSheet('username')}>
                  {p?.username ? `Change username (${p.changesLeft} left)` : 'Pick a username'}
                </Button>
                <Button variant="ghost" onClick={() => setSheet('icon')}>Change icon</Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="me-head">
            <Avatar icon="ticket" colour="sand" size={88} />
            <div className="stack" style={{ gap: 8 }}>
              <h1 className="game-title" style={{ margin: 0 }}>Playing as a guest</h1>
              <p className="body" style={{ margin: 0 }}>Your progress is saved on this device. Sign in to keep it on every device, get a username and an icon, and add friends.</p>
              <div><Button onClick={() => openSignIn()}>Sign in</Button></div>
            </div>
          </section>
        )}

        <section className="me-stats" aria-label="Your numbers">
          <div className="me-stat"><span className="me-stat-n">{me ? p?.streak ?? 0 : played.filter(({ s }) => s.streak > 0).length}</span><span className="small muted">{me ? 'day streak (any daily game)' : 'daily streaks going'}</span></div>
          <div className="me-stat"><span className="me-stat-n">{longest}</span><span className="small muted">longest streak</span></div>
          <div className="me-stat"><span className="me-stat-n">{played.length}</span><span className="small muted">games played</span></div>
        </section>

        {me && (
          <Suspense fallback={null}>
            <Friends profile={p} />
          </Suspense>
        )}

        <section>
          <h2 className="card-title">Your games</h2>
          {played.length === 0 ? <p className="body muted">Nothing played yet. <a href="/">Pick a game</a>.</p> : (
            <ul className="me-games">
              {played.map(({ g, s }) => (
                <li key={g.slug}>
                  <a href={`/${g.slug}/`} className="me-game">
                    <span className="me-game-dot" style={{ background: `var(--${g.color})` }} aria-hidden="true">{g.emoji}</span>
                    <span className="me-game-name">{g.title}</span>
                    <span className="small muted">{g.daily ? (todaysDailyText(g.slug) ? `Today: ${todaysDailyText(g.slug)}` : 'Not played today') : s.bestText ? `Best: ${s.bestText}` : `${s.plays} played`}{s.streak > 1 ? ` · ${s.streak} days` : ''}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {me && (
          <section>
            <h2 className="card-title">Icons to earn</h2>
            <ul className="me-earn">
              {EARNED_ICONS.map(({ id, how }) => (
                <li key={id} className={unlocked.has(id) ? 'is-earned' : undefined}>
                  <Avatar icon={id} colour={unlocked.has(id) ? p?.colour : 'sand'} size={40} />
                  <span className="small">{unlocked.has(id) ? <strong>Earned · </strong> : null}{how}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="stack">
          <h2 className="card-title">Your data</h2>
          {me ? (
            <>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => void downloadAll()}>Download my data</Button>
                <Button variant="secondary" onClick={() => void signOut()}>Sign out</Button>
                <Button variant="ghost" onClick={() => setSheet('delete')}>Delete my account</Button>
              </div>
              <p className="small muted" style={{ margin: 0 }}>Signing out keeps your progress on this device as a guest. More on the <a href="/privacy/">privacy page</a>.</p>
            </>
          ) : <p className="body muted" style={{ margin: 0 }}>Download or delete what this device keeps on the <a href="/privacy/">privacy page</a>.</p>}
        </section>
      </main>

      <Sheet open={sheet === 'username'} onClose={() => setSheet(null)} title="Your username">
        <Suspense fallback={null}><UsernameForm onDone={() => setSheet(null)} /></Suspense>
      </Sheet>
      <Sheet open={sheet === 'icon'} onClose={() => setSheet(null)} title="Your icon">
        <Suspense fallback={null}><IconPicker onDone={() => setSheet(null)} /></Suspense>
      </Sheet>
      <Sheet open={sheet === 'delete'} onClose={() => setSheet(null)} title="Delete your account">
        <DeleteAccount username={p?.username ?? null} onCancel={() => setSheet(null)} />
      </Sheet>
    </div>
  )
}

/** Everything about the player, as one file: the account (profile and saved data) and this device. */
async function downloadAll() {
  const local: Record<string, unknown> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      if (k.startsWith('qg:') && k !== 'qg:session') local[k.slice(3)] = JSON.parse(localStorage.getItem(k)!)
    }
  } catch { /* storage off */ }
  const [profile, data] = await Promise.all([rpc('my_profile').catch(() => null), rpc('get_data').catch(() => null)])
  const blob = new Blob([JSON.stringify({ savedOn: new Date().toISOString(), email: getSession()?.user.email, profile, account: data, device: local }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'pocket-fair-my-data.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function DeleteAccount({ username, onCancel }: { username: string | null; onCancel: () => void }) {
  const [typed, setTyped] = useState('')
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle')
  const word = username ?? 'delete'
  async function go() {
    setState('working')
    try {
      await deleteAccount()
      await signOut()
      location.href = '/'
    } catch {
      setState('failed')
    }
  }
  return (
    <div className="stack">
      <p className="body" style={{ margin: 0 }}>This removes your account for good: your username, icon, friends, saved progress and board results. {username ? `Your username stays reserved for 30 days, then anyone can take it.` : ''} Progress on this device stays as a guest.</p>
      <TextField id="delete-confirm" label={`Type ${word} to confirm`} value={typed} onChange={setTyped} autoComplete="off" />
      {state === 'failed' && <p className="small acct-error" role="alert" style={{ margin: 0 }}>Couldn’t delete it just now. Check your connection and try again.</p>}
      <div className="row">
        <Button color="chili" disabled={typed !== word || state === 'working'} onClick={() => void go()}>{state === 'working' ? 'Deleting…' : 'Delete my account'}</Button>
        <Button variant="ghost" onClick={onCancel}>Keep it</Button>
      </div>
    </div>
  )
}

mount(document.getElementById('root'), <StrictMode><Me /></StrictMode>)
mount(document.getElementById('footer'), <StrictMode><div className="page"><SiteFooter /></div></StrictMode>)
ready()
