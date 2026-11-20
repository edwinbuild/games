// The account screens that open over any page: sign in by email link, and the first-sign-in
// steps (bring this device's progress along, pick a username, pick an icon). Loaded on demand.
import { useEffect, useRef, useState } from 'react'
import { sendSignInLink } from './auth-actions'
import { cachedProfile, checkUsername, claimThisDevice, problemOf, refreshProfile, setIcon, setUsername, USERNAME_PROBLEM, type Profile } from './account'
import { syncNow } from './sync'
import { Button, TextField } from '../ui'
import { Avatar, EARNED_ICONS, ICON_COLOURS, OPEN_ICONS } from '../ui/icons'
import { Sheet } from '../ui/Sheet'

export type SheetMode = { kind: 'sign-in'; error?: string } | { kind: 'welcome' } | { kind: 'username' } | { kind: 'icon' }

export default function AccountSheets({ mode, onClose }: { mode: SheetMode; onClose: () => void }) {
  const [step, setStep] = useState<SheetMode>(mode)
  useEffect(() => setStep(mode), [mode])
  const title = step.kind === 'sign-in' ? 'Sign in' : step.kind === 'icon' ? 'Your icon' : step.kind === 'username' ? 'Your username' : 'Welcome'
  return (
    <Sheet open onClose={onClose} title={title}>
      {step.kind === 'sign-in' && <SignIn error={step.error} />}
      {step.kind === 'welcome' && <Welcome onUsername={() => setStep({ kind: 'username' })} onDone={onClose} />}
      {step.kind === 'username' && <UsernameForm onDone={(first) => (first ? setStep({ kind: 'icon' }) : onClose())} />}
      {step.kind === 'icon' && <IconPicker onDone={onClose} />}
    </Sheet>
  )
}

function SignIn({ error }: { error?: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [msg, setMsg] = useState(error ?? '')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  async function send() {
    if (!valid || state === 'sending') return
    setState('sending')
    setMsg('')
    try {
      await sendSignInLink(email)
      setState('sent')
    } catch (e) {
      setMsg((e as Error).message)
      setState('idle')
    }
  }
  if (state === 'sent') {
    return (
      <div className="stack">
        <p className="body" style={{ margin: 0 }}>📬 Check your inbox at <strong>{email.trim()}</strong>. The link in the email signs you in on this device and brings you back here.</p>
        <p className="small muted" style={{ margin: 0 }}>Nothing after a few minutes? Check spam, or send it again.</p>
        <Button variant="secondary" onClick={() => setState('idle')}>Use a different email or send again</Button>
      </div>
    )
  }
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); void send() }}>
      <p className="body" style={{ margin: 0 }}>Keep your streaks on every device, get a username and an icon on the boards, and add friends. Every game still works without signing in.</p>
      {msg && <p className="small acct-error" role="alert" style={{ margin: 0 }}>{msg}</p>}
      <TextField id="signin-email" label="Your email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" autoComplete="email" />
      <Button type="submit" size="lg" block disabled={!valid || state === 'sending'} data-primary="click">{state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</Button>
      <Button variant="secondary" block disabled aria-describedby="google-soon">Continue with Google</Button>
      <p id="google-soon" className="small muted center" style={{ margin: 0 }}>Google sign-in is coming soon.</p>
      <p className="small muted" style={{ margin: 0 }}>You need to be 13 or older. Your email is only used to sign you in and is never shown to anyone. <a href="/privacy/">Privacy</a></p>
    </form>
  )
}

/** Right after the email link: bring this device's progress along, then a username if there's none yet. */
function Welcome({ onUsername, onDone }: { onUsername: () => void; onDone: () => void }) {
  const [p, setP] = useState<Profile | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        await claimThisDevice().catch(() => {})
        await syncNow().catch(() => {})
        const prof = await refreshProfile()
        if (!live) return
        if (!prof.username) onUsername()
        else setP(prof)
      } catch {
        if (live) setFailed(true)
      }
    })()
    return () => { live = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (failed) return <p className="body" style={{ margin: 0 }}>You’re signed in, but your profile couldn’t load just now. It will try again next time a page opens.</p>
  if (!p) return <p className="body muted" role="status" style={{ margin: 0 }}>Signing you in and bringing your progress along…</p>
  return (
    <div className="stack">
      <div className="acct-hello">
        <Avatar icon={p.icon} colour={p.colour} size={56} />
        <p className="body" style={{ margin: 0 }}>Welcome back, <strong>{p.username}</strong>. Your progress on this device is saved to your account.</p>
      </div>
      <Button size="lg" block onClick={onDone}>Carry on playing</Button>
    </div>
  )
}

/** Pick or change the username, with a live check as you type. */
export function UsernameForm({ onDone }: { onDone: (first: boolean) => void }) {
  const current = cachedProfile()
  const first = !current?.username
  const [name, setName] = useState(current?.username ?? '')
  const [problem, setProblem] = useState<string | null | undefined>(undefined) // undefined = not checked yet
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const seq = useRef(0)
  const changed = name !== (current?.username ?? '')

  // Check the name a moment after typing stops.
  useEffect(() => {
    setProblem(undefined)
    setConfirming(false)
    if (!changed) return
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) { setProblem('format'); return }
    const n = ++seq.current
    const t = setTimeout(() => { checkUsername(name).then((r) => { if (n === seq.current) setProblem(r) }, () => {}) }, 350)
    return () => clearTimeout(t)
  }, [name]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!first && !confirming) { setConfirming(true); return }
    setSaving(true)
    setError('')
    try {
      await setUsername(name)
      onDone(first)
    } catch (e) {
      const why = problemOf(e)
      setError(why ? USERNAME_PROBLEM[why] ?? 'That name can’t be used.' : /no changes left/.test(String(e)) ? 'You’ve used all 5 changes.' : 'Couldn’t save it. Try again.')
      setSaving(false)
      setConfirming(false)
    }
  }
  const left = current?.changesLeft ?? 5
  if (!first && left === 0) return <p className="body" style={{ margin: 0 }}>You’re <strong>{current?.username}</strong>. You’ve used all 5 username changes.</p>
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (problem === null) void save() }}>
      <p className="body" style={{ margin: 0 }}>
        {first ? 'This is how you appear on the boards and to friends. You can change it 5 times later.' : `You can change your username ${left} more ${left === 1 ? 'time' : 'times'}.`}
      </p>
      <TextField id="acct-username" label="Username" value={name} onChange={(v) => setName(v.replace(/\s/g, '').slice(0, 16))} placeholder="3–16 letters, numbers or _" autoComplete="off" />
      <p className={`small acct-check${problem === null ? ' is-ok' : problem ? ' is-bad' : ''}`} role="status" style={{ margin: 0 }}>
        {!changed ? '' : problem === undefined ? 'Checking…' : problem === null ? '✓ Available' : USERNAME_PROBLEM[problem] ?? 'That name can’t be used.'}
      </p>
      {error && <p className="small acct-error" role="alert" style={{ margin: 0 }}>{error}</p>}
      {confirming ? (
        <div className="stack">
          <p className="body-strong" style={{ margin: 0 }}>Change to {name}? You’ll have {left - 1} {left - 1 === 1 ? 'change' : 'changes'} left, and {current?.username} stays reserved for you for 30 days.</p>
          <div className="row">
            <Button onClick={() => void save()} disabled={saving}>Yes, change it</Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Keep {current?.username}</Button>
          </div>
        </div>
      ) : (
        <Button type="submit" size="lg" block disabled={problem !== null || saving || !changed}>{saving ? 'Saving…' : first ? 'Use this name' : 'Change username'}</Button>
      )}
    </form>
  )
}

/** Pick an icon and its colour; locked icons say how to earn them. */
export function IconPicker({ onDone }: { onDone: () => void }) {
  const p = cachedProfile()
  const [icon, setI] = useState(p?.icon ?? 'ticket')
  const [colour, setC] = useState(p?.colour ?? 'mint')
  const [saving, setSaving] = useState(false)
  const [hint, setHint] = useState('')
  const unlocked = new Set(p?.unlocked ?? [])
  async function save() {
    setSaving(true)
    try {
      await setIcon(icon, colour)
      onDone()
    } catch {
      setHint('Couldn’t save it. Try again.')
      setSaving(false)
    }
  }
  return (
    <div className="stack">
      <div className="acct-hello"><Avatar icon={icon} colour={colour} size={64} label="Your icon" /><p className="body" style={{ margin: 0 }}>Shown next to your name on boards, in online rooms and to friends.</p></div>
      <div className="acct-icons" role="radiogroup" aria-label="Icon">
        {OPEN_ICONS.map((id) => (
          <button key={id} type="button" role="radio" aria-checked={icon === id} aria-label={id} className="acct-icon" onClick={() => { setI(id); setHint('') }}>
            <Avatar icon={id} colour={colour} size={40} />
          </button>
        ))}
        {EARNED_ICONS.map(({ id, how }) => {
          const open = unlocked.has(id)
          return (
            <button key={id} type="button" role="radio" aria-checked={icon === id} aria-label={open ? id : `${id}, locked: ${how}`} className={`acct-icon${open ? '' : ' is-locked'}`}
              onClick={() => (open ? (setI(id), setHint('')) : setHint(`🔒 ${how} to unlock this one.`))}>
              <Avatar icon={id} colour={colour} size={40} />
            </button>
          )
        })}
      </div>
      <p className="small muted" role="status" style={{ margin: 0, minHeight: 20 }}>{hint}</p>
      <div className="acct-colours" role="radiogroup" aria-label="Colour">
        {ICON_COLOURS.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={colour === c} aria-label={c} className="acct-colour" style={{ background: `var(--${c})` }} onClick={() => setC(c)} />
        ))}
      </div>
      <Button size="lg" block onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Use this icon'}</Button>
    </div>
  )
}
