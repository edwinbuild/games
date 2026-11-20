// The admin page (/admin/): locked to the admin's account and PIN (both checked in the database).
// Overview, games, site settings, moderation, players and security.
import { StrictMode, useEffect, useReducer, useState, type ReactNode } from 'react'
import { GAMES, LISTED } from '../games/registry'
import { SITE } from '../site'
import { AccountKey } from '../shell/AccountKey'
import { rpc } from '../shell/api'
import { onAuthChange, openSignIn, signedIn } from '../shell/auth'
import { challengeUrl } from '../shell/challenge'
import { setConfig, type SiteConfig } from '../shell/config'
import { dateKey } from '../shell/daily'
import { mount, ready } from '../shell/mount'
import { load, save } from '../shell/storage'
import { BOARD_GAMES } from '../shell/board'
import { Button, Segmented, TextField, TopBar } from '../ui'
import '../shell/styles'
import '../shell/errors'

type Session = { token: string; expires: number }
const getAdmin = () => { const s = load<Session | null>('admin', null); return s && s.expires * 1000 > Date.now() ? s : null }
const title = (slug: string) => GAMES.find((g) => g.slug === slug)?.title ?? slug
// Count Flash's seeds don't start with its name, so a re-roll can't reach it.
const REROLLABLE = LISTED.filter((g) => g.daily && g.slug !== 'count-flash')
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return dateKey(d) }
const errText = (e: unknown) => String((e as Error)?.message ?? e)

function Lock({ onOpen }: { onOpen: (s: Session) => void }) {
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    setMsg('')
    try {
      const r = await rpc<{ token?: string; expires?: number; error?: string; left?: number }>('admin_unlock', { p_pin: pin })
      if (r.token) { const s = { token: r.token, expires: r.expires! }; save('admin', s); onOpen(s); return }
      setMsg(r.error === 'locked' ? 'Too many wrong tries. Wait 15 minutes.' : r.error === 'no pin' ? 'No admin PIN is set yet.' : `That’s not it${r.left != null ? ` (${r.left} tries left)` : ''}.`)
    } catch (e) {
      setMsg(errText(e))
    }
    setPin('')
    setBusy(false)
  }
  return (
    <form className="stack admin-lock" onSubmit={(e) => { e.preventDefault(); if (pin.length >= 5) void go() }}>
      <h1 className="game-title" style={{ margin: 0 }}>Admin</h1>
      <p className="body" style={{ margin: 0 }}>Enter the admin PIN. Only the admin’s account can open this page.</p>
      <div className="qg-field">
        <label htmlFor="admin-pin">PIN</label>
        <input id="admin-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={12} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
      </div>
      {msg && <p className="small acct-error" role="alert" style={{ margin: 0 }}>{msg}</p>}
      <Button type="submit" size="lg" block disabled={pin.length < 5 || busy}>{busy ? 'Checking…' : 'Unlock'}</Button>
    </form>
  )
}

type Dash = {
  games: { game: string; starts: number; finishes: number; shares: number; play_next: number; finishes_all: number; daily: number[] }[]
  today: { starts: number; finishes: number }
  finishesAll: number; accounts: number; accounts7: number; named: number; friendships: number
  boardsToday: Record<string, number>; errors7: number; reports: number; banned: number
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${30 - (v / max) * 28}`).join(' ')
  return <svg className="admin-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} /></svg>
}

function Overview({ token }: { token: string }) {
  const [d, setD] = useState<Dash | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { rpc<Dash>('admin_dashboard', { p_token: token, p_days: 14 }).then(setD, (e) => setErr(errText(e))) }, [token])
  if (err) return <p className="acct-error">{err}</p>
  if (!d) return <p className="muted">Loading…</p>
  const kpi: [string, ReactNode][] = [
    ['Started today', d.today.starts], ['Finished today', d.today.finishes], ['Finished, all time', d.finishesAll],
    ['Accounts', `${d.accounts} (+${d.accounts7} this week)`], ['With a username', d.named], ['Friendships', d.friendships],
    ['Errors, 7 days', d.errors7], ['Reports waiting', d.reports], ['Banned', d.banned],
  ]
  return (
    <div className="stack">
      <div className="admin-kpis">{kpi.map(([k, v]) => <div key={k} className="me-stat"><span className="me-stat-n">{v}</span><span className="small muted">{k}</span></div>)}</div>
      <h2 className="card-title">Games, last 14 days</h2>
      <div className="table-wrap">
        <table className="stats-table">
          <thead><tr><th>Game</th><th>Started</th><th>Finished</th><th>Finish rate</th><th>Shared</th><th>All time</th><th>On today’s board</th><th>14 days</th></tr></thead>
          <tbody>
            {d.games.map((g) => (
              <tr key={g.game}>
                <td>{title(g.game)}</td><td>{g.starts}</td><td>{g.finishes}</td>
                <td>{g.starts ? `${Math.round((g.finishes / g.starts) * 100)}%` : '–'}</td>
                <td>{g.shares}</td><td>{g.finishes_all}</td><td>{d.boardsToday[g.game] ?? '–'}</td>
                <td><Spark values={g.daily ?? []} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Games({ token, cfg, apply }: { token: string; cfg: SiteConfig; apply: (patch: Partial<SiteConfig>) => Promise<void> }) {
  const [boardGame, setBoardGame] = useState(REROLLABLE[0]?.slug ?? '')
  const [board, setBoard] = useState<{ rank: number; nick: string | null; text: string; who: string; handle: string }[] | null>(null)
  const [msg, setMsg] = useState('')
  const toggle = (list: 'disabled' | 'new' | 'featured', slug: string) => {
    const has = cfg[list].includes(slug)
    void apply({ [list]: has ? cfg[list].filter((s) => s !== slug) : [...cfg[list], slug] })
  }
  async function reroll(slug: string) {
    if (!confirm(`Give ${title(slug)} a new puzzle for today? Anyone who already played saw the old one.`)) return
    try { setConfig(await rpc<SiteConfig>('admin_reroll', { p_token: token, p_game: slug, p_day: dateKey() })); setMsg(`${title(slug)} has a new puzzle for today.`) } catch (e) { setMsg(errText(e)) }
  }
  async function loadBoard() {
    try { setBoard(await rpc('admin_board', { p_token: token, p_game: boardGame, p_day: dateKey() })) } catch (e) { setMsg(errText(e)) }
  }
  async function remove(handle: string) {
    if (!confirm('Remove this score from today’s board?')) return
    await rpc('admin_remove_score', { p_token: token, p_game: boardGame, p_day: dateKey(), p_handle: handle }).catch((e) => setMsg(errText(e)))
    void loadBoard()
  }
  const origin = location.origin
  return (
    <div className="stack">
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      <div className="table-wrap">
        <table className="stats-table admin-games">
          <thead><tr><th>Game</th><th>On</th><th>New</th><th>Featured</th><th>Daily puzzle</th></tr></thead>
          <tbody>
            {LISTED.map((g) => (
              <tr key={g.slug}>
                <td><a href={`/${g.slug}/`}>{g.title}</a></td>
                <td><input type="checkbox" aria-label={`${g.title} on`} checked={!cfg.disabled.includes(g.slug)} onChange={() => toggle('disabled', g.slug)} /></td>
                <td><input type="checkbox" aria-label={`${g.title} new`} checked={cfg.new.includes(g.slug)} onChange={() => toggle('new', g.slug)} /></td>
                <td><input type="checkbox" aria-label={`${g.title} featured`} checked={cfg.featured.includes(g.slug)} onChange={() => toggle('featured', g.slug)} /></td>
                <td className="admin-links">
                  {g.daily ? (
                    <>
                      <a href={challengeUrl(origin, { g: g.slug, s: dateKey(), r: [] })} target="_blank" rel="noopener">Today</a>
                      <a href={challengeUrl(origin, { g: g.slug, s: tomorrow(), r: [] })} target="_blank" rel="noopener">Tomorrow</a>
                      {REROLLABLE.some((x) => x.slug === g.slug) && <button type="button" className="linkish" onClick={() => void reroll(g.slug)}>Re-roll today{cfg.rerolls[`${g.slug}:${dateKey()}`] ? ` (${cfg.rerolls[`${g.slug}:${dateKey()}`]})` : ''}</button>}
                    </>
                  ) : <span className="muted">Any time</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="card-title">Today’s board</h2>
      <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="qg-field">
          <label htmlFor="board-game">Game</label>
          <select id="board-game" value={boardGame} onChange={(e) => { setBoardGame(e.target.value); setBoard(null) }}>
            {LISTED.filter((g) => BOARD_GAMES.has(g.slug)).map((g) => <option key={g.slug} value={g.slug}>{g.title}</option>)}
          </select>
        </div>
        <Button variant="secondary" onClick={() => void loadBoard()}>Show</Button>
      </div>
      {board && (board.length === 0 ? <p className="muted">Nobody on this board yet today.</p> : (
        <ol className="qg-board-list">
          {board.map((r) => (
            <li key={r.handle}><span className="qg-board-rank">{r.rank}</span><span className="qg-board-name">{r.nick ?? 'A player'} <span className="small muted">({r.who})</span></span><span className="qg-board-score">{r.text}</span>
              <button type="button" className="linkish small" onClick={() => void remove(r.handle)}>Remove</button></li>
          ))}
        </ol>
      ))}
    </div>
  )
}

function Site({ cfg, apply }: { cfg: SiteConfig; apply: (patch: Partial<SiteConfig>) => Promise<void> }) {
  const [banner, setBanner] = useState(cfg.banner?.text ?? '')
  const [link, setLink] = useState(cfg.banner?.link ?? '')
  const [until, setUntil] = useState(cfg.banner?.until?.slice(0, 16) ?? '')
  const [maint, setMaint] = useState(cfg.maintenance?.text ?? '')
  const [plays, setPlays] = useState(String(cfg.counters.plays))
  const [online, setOnline] = useState(String(cfg.counters.online))
  const flag = (label: string, on: boolean, patch: (v: boolean) => Partial<SiteConfig>) => (
    <label className="admin-flag"><input type="checkbox" checked={on} onChange={(e) => void apply(patch(e.target.checked))} /> {label}</label>
  )
  return (
    <div className="stack">
      <h2 className="card-title">Announcement</h2>
      <TextField id="banner-text" label="Banner text (empty hides it)" value={banner} onChange={setBanner} maxLength={200} />
      <TextField id="banner-link" label="Link (a page like /dots-and-boxes/, or https://…)" value={link} onChange={setLink} />
      <div className="qg-field"><label htmlFor="banner-until">Show until (optional)</label><input id="banner-until" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} /></div>
      <Button onClick={() => void apply({ banner: banner.trim() ? { text: banner.trim(), ...(link.trim() ? { link: link.trim() } : {}), ...(until ? { until: new Date(until).toISOString() } : {}) } : null })}>Save banner</Button>
      <h2 className="card-title">Maintenance note</h2>
      <TextField id="maint-text" label="Shown on every page (empty hides it)" value={maint} onChange={setMaint} maxLength={200} />
      <Button onClick={() => void apply({ maintenance: maint.trim() ? { text: maint.trim() } : null })}>Save note</Button>
      <h2 className="card-title">Switches</h2>
      {flag('Online rooms open', cfg.rooms, (v) => ({ rooms: v }))}
      {flag('New sign-ups allowed', cfg.signups, (v) => ({ signups: v }))}
      {flag('Auto play: today’s run', cfg.autoplay.run, (v) => ({ autoplay: { ...cfg.autoplay, run: v } }))}
      {flag('Auto play: replay arcade games', cfg.autoplay.replay, (v) => ({ autoplay: { ...cfg.autoplay, replay: v } }))}
      <div className="stack" style={{ gap: 4 }}>
        <span className="eyebrow muted">Comments</span>
        <Segmented label="Comments" value={cfg.comments} onChange={(v) => void apply({ comments: v })}
          options={[{ value: 'off', label: 'Off' }, { value: 'review', label: 'After review' }, { value: 'on', label: 'On' }]} />
      </div>
      <h2 className="card-title">Counters</h2>
      <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField id="c-plays" label="Show plays from" value={plays} onChange={(v) => setPlays(v.replace(/\D/g, ''))} />
        <TextField id="c-online" label="Show online from" value={online} onChange={(v) => setOnline(v.replace(/\D/g, ''))} />
        <Button variant="secondary" onClick={() => void apply({ counters: { ...cfg.counters, plays: +plays || 0, online: +online || 0 } })}>Save</Button>
      </div>
    </div>
  )
}

function Moderation({ token }: { token: string }) {
  const [reports, setReports] = useState<{ username: string; reports: number; last: string; banned: boolean }[] | null>(null)
  const [words, setWords] = useState<{ blocked: string[]; reserved: string[] } | null>(null)
  const [errors, setErrors] = useState<{ day: string; page: string; message: string; count: number }[]>([])
  const [add, setAdd] = useState({ blocked: '', reserved: '' })
  const [msg, setMsg] = useState('')
  const loadAll = () => {
    rpc<typeof reports>('admin_reports', { p_token: token }).then(setReports, (e) => setMsg(errText(e)))
    rpc<typeof words>('admin_words', { p_token: token }).then(setWords, () => {})
    rpc<typeof errors>('admin_errors', { p_token: token }).then(setErrors, () => {})
  }
  useEffect(loadAll, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  async function act(fn: string, args: Record<string, unknown>, done: string) {
    try { await rpc(fn, { p_token: token, ...args }); setMsg(done); loadAll() } catch (e) { setMsg(errText(e)) }
  }
  async function word(list: 'blocked' | 'reserved', w: string, on: boolean) {
    try { setWords(await rpc('admin_set_word', { p_token: token, p_list: list, p_word: w, p_add: on })); setAdd({ ...add, [list]: '' }) } catch (e) { setMsg(errText(e)) }
  }
  return (
    <div className="stack">
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      <h2 className="card-title">Reported usernames</h2>
      {!reports ? <p className="muted">Loading…</p> : reports.length === 0 ? <p className="muted">No reports waiting.</p> : (
        <ul className="qg-friends">
          {reports.map((r) => (
            <li key={r.username} className="qg-friend" style={{ gridTemplateColumns: '1fr auto' }}>
              <span className="qg-friend-text"><strong>{r.username}</strong><span className="small muted">{r.reports} report{r.reports === 1 ? '' : 's'}{r.banned ? ' · banned' : ''}</span></span>
              <span className="qg-friend-actions">
                <Button variant="ghost" onClick={() => void act('admin_dismiss_reports', { p_name: r.username }, `Dismissed reports for ${r.username}.`)}>Dismiss</Button>
                <Button variant="secondary" onClick={() => void act('admin_force_rename', { p_name: r.username }, `${r.username} must pick a new name.`)}>Make them rename</Button>
                <Button color="chili" onClick={() => void act('admin_ban', { p_name: r.username, p_on: true, p_reason: 'reported username' }, `Banned ${r.username}.`)}>Ban</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {(['blocked', 'reserved'] as const).map((list) => (
        <div key={list} className="stack">
          <h2 className="card-title">{list === 'blocked' ? 'Word filter (names and comments)' : 'Reserved usernames'}</h2>
          <div className="admin-words">{words?.[list].map((w) => <button key={w} type="button" className="admin-word" onClick={() => { if (confirm(`Remove “${w}”?`)) void word(list, w, false) }} aria-label={`Remove ${w}`}>{w} ✕</button>)}</div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (add[list].trim()) void word(list, add[list], true) }}>
            <TextField id={`add-${list}`} label="Add" value={add[list]} onChange={(v) => setAdd({ ...add, [list]: v })} autoComplete="off" />
            <Button type="submit" variant="secondary">Add</Button>
          </form>
        </div>
      ))}
      <h2 className="card-title">Browser errors, 14 days</h2>
      {errors.length === 0 ? <p className="muted">None. 🎉</p> : (
        <div className="table-wrap"><table className="stats-table"><thead><tr><th>Day</th><th>Page</th><th>Message</th><th>Count</th></tr></thead>
          <tbody>{errors.map((e, i) => <tr key={i}><td>{e.day}</td><td>{e.page}</td><td>{e.message}</td><td>{e.count}</td></tr>)}</tbody></table></div>
      )}
    </div>
  )
}

type Player = { username: string; icon: string; colour: string; joined: string; changesUsed: number; email: string; results: number; friends: number; reports: number; banned: boolean; banReason: string | null }
function Players({ token }: { token: string }) {
  const [name, setName] = useState('')
  const [p, setP] = useState<Player | null>(null)
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')
  async function find(n = name) {
    setMsg(''); setEmail(''); setConfirmDelete('')
    try { setP(await rpc<Player>('admin_player', { p_token: token, p_name: n.trim() })) } catch (e) { setP(null); setMsg(errText(e) === 'no such player' ? 'No player has that exact username.' : errText(e)) }
  }
  async function act(fn: string, args: Record<string, unknown>, done: string, refind = true) {
    try {
      await rpc(fn, { p_token: token, p_name: p!.username, ...args })
      if (refind) await find(p!.username); else setP(null)
      setMsg(done)
    } catch (e) { setMsg(errText(e)) }
  }
  return (
    <div className="stack">
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void find() }}>
        <TextField id="find-player" label="Exact username" value={name} onChange={setName} autoComplete="off" />
        <Button type="submit">Find</Button>
      </form>
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      {p && (
        <div className="stack admin-player">
          <p className="body" style={{ margin: 0 }}><strong>{p.username ?? '(no username)'}</strong> · joined {p.joined.slice(0, 10)} · {p.results} daily results · {p.friends} friends · {p.reports} reports · username changes used {p.changesUsed}{p.banned ? ` · banned (${p.banReason ?? 'no reason'})` : ''}</p>
          <p className="small" style={{ margin: 0 }}>Email: {email || p.email} {!email && <button type="button" className="linkish" onClick={() => void rpc<string>('admin_reveal_email', { p_token: token, p_name: p.username }).then(setEmail, (e) => setMsg(errText(e)))}>Reveal (logged)</button>}</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {p.banned
              ? <Button variant="secondary" onClick={() => void act('admin_ban', { p_on: false }, 'Unbanned.')}>Unban</Button>
              : <Button color="chili" onClick={() => { const why = prompt('Why? (shown only here)') ?? ''; void act('admin_ban', { p_on: true, p_reason: why }, 'Banned: hidden from boards and can’t comment.') }}>Ban</Button>}
            <Button variant="secondary" onClick={() => void act('admin_force_rename', {}, 'They’ll pick a new name next visit; the old one is held 30 days.', false)}>Make them rename</Button>
            <Button variant="ghost" onClick={() => void act('admin_reset_changes', {}, 'Username changes reset to 5.')}>Reset name changes</Button>
          </div>
          <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <TextField id="delete-player" label={`Type ${p.username} to delete the account`} value={confirmDelete} onChange={setConfirmDelete} autoComplete="off" />
            <Button color="chili" disabled={confirmDelete !== p.username} onClick={() => void act('admin_delete_player', {}, 'Account deleted.', false)}>Delete account</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Security({ token, onLock }: { token: string; onLock: () => void }) {
  const [info, setInfo] = useState<{ attempts: { ok: boolean; at: string; mine: boolean }[]; sessions: number; log: { action: string; detail: unknown; at: string }[] } | null>(null)
  const [oldPin, setOld] = useState('')
  const [newPin, setNew] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => { rpc<typeof info>('admin_security', { p_token: token }).then(setInfo, (e) => setMsg(errText(e))) }, [token, msg])
  async function change() {
    try { await rpc('admin_set_pin', { p_token: token, p_old: oldPin, p_new: newPin }); setMsg('PIN changed. Other admin sessions were signed out.'); setOld(''); setNew('') } catch (e) { setMsg(errText(e) === 'wrong pin' ? 'The current PIN is wrong.' : errText(e) === 'pin format' ? 'Use 5 to 12 digits.' : errText(e)) }
  }
  return (
    <div className="stack">
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      <h2 className="card-title">Change PIN</h2>
      <form className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); void change() }}>
        <div className="qg-field"><label htmlFor="pin-old">Current PIN</label><input id="pin-old" type="password" inputMode="numeric" autoComplete="off" value={oldPin} onChange={(e) => setOld(e.target.value.replace(/\D/g, ''))} /></div>
        <div className="qg-field"><label htmlFor="pin-new">New PIN (5–12 digits)</label><input id="pin-new" type="password" inputMode="numeric" autoComplete="off" value={newPin} onChange={(e) => setNew(e.target.value.replace(/\D/g, ''))} /></div>
        <Button type="submit" disabled={oldPin.length < 5 || newPin.length < 5}>Change PIN</Button>
      </form>
      <div className="row"><Button variant="secondary" onClick={() => void rpc('admin_end_sessions', { p_token: token }).then(onLock)}>Sign out of admin everywhere</Button><Button variant="ghost" onClick={onLock}>Lock this device</Button></div>
      <h2 className="card-title">Last PIN tries</h2>
      <ul className="small" style={{ margin: 0 }}>{info?.attempts.map((a, i) => <li key={i}>{a.at.slice(0, 16).replace('T', ' ')} · {a.ok ? '✓ right' : '✗ wrong'}{a.mine ? '' : ' · another account'}</li>)}</ul>
      <h2 className="card-title">Admin log</h2>
      <ul className="small" style={{ margin: 0 }}>{info?.log.map((l, i) => <li key={i}>{l.at.slice(0, 16).replace('T', ' ')} · {l.action}{l.detail ? ` · ${JSON.stringify(l.detail).slice(0, 120)}` : ''}</li>)}</ul>
    </div>
  )
}

type Tab = 'overview' | 'games' | 'site' | 'moderation' | 'players' | 'security'
function Admin() {
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const [session, setSession] = useState<Session | null>(getAdmin)
  const [tab, setTab] = useState<Tab>(() => load<Tab>('admin-tab', 'overview'))
  const [cfg, setCfg] = useState<SiteConfig | null>(null)
  const [note, setNote] = useState('')
  useEffect(() => onAuthChange(redraw), [])
  // A stored session that the database no longer accepts (expired, PIN changed) locks again.
  useEffect(() => {
    if (!session) return
    rpc('admin_check', { p_token: session.token }).catch(() => { save('admin', null); setSession(null) })
    rpc<SiteConfig>('site_config').then((c) => { setCfg(c); setConfig(c) }, () => {})
  }, [session])
  const lock = () => { save('admin', null); setSession(null) }
  async function apply(patch: Partial<SiteConfig>) {
    // Shown at once; put back if the database refuses it.
    const before = cfg
    setCfg((c) => (c ? { ...c, ...patch } : c))
    try {
      const c = await rpc<SiteConfig>('admin_set_config', { p_token: session!.token, p_patch: patch })
      setCfg(c); setConfig(c); setNote('Saved.')
      setTimeout(() => setNote(''), 1500)
    } catch (e) { setCfg(before); setNote(errText(e)) }
  }
  const pickTab = (t: Tab) => { setTab(t); save('admin-tab', t) }

  let body: ReactNode
  if (!signedIn()) body = <div className="stack"><h1 className="game-title" style={{ margin: 0 }}>Admin</h1><p className="body" style={{ margin: 0 }}>Sign in with the admin account first.</p><div><Button onClick={() => openSignIn()}>Sign in</Button></div></div>
  else if (!session) body = <Lock onOpen={setSession} />
  else body = (
    <div className="stack">
      <div className="between"><h1 className="game-title" style={{ margin: 0 }}>Admin</h1>{note && <span className="small" role="status">{note}</span>}</div>
      <nav className="admin-tabs" aria-label="Admin sections">
        {(['overview', 'games', 'site', 'moderation', 'players', 'security'] as Tab[]).map((t) => (
          <button key={t} type="button" aria-current={tab === t ? 'page' : undefined} onClick={() => pickTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </nav>
      {tab === 'overview' && <Overview token={session.token} />}
      {tab === 'games' && (cfg ? <Games token={session.token} cfg={cfg} apply={apply} /> : <p className="muted">Loading…</p>)}
      {tab === 'site' && (cfg ? <Site cfg={cfg} apply={apply} /> : <p className="muted">Loading…</p>)}
      {tab === 'moderation' && <Moderation token={session.token} />}
      {tab === 'players' && <Players token={session.token} />}
      {tab === 'security' && <Security token={session.token} onLock={lock} />}
    </div>
  )
  return (
    <div className="page page--home">
      <TopBar siteName={SITE.name} right={<AccountKey />} />
      <main className="admin">{body}</main>
    </div>
  )
}

mount(document.getElementById('root'), <StrictMode><Admin /></StrictMode>)
ready()
