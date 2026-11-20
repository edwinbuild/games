// Comments under a game: newest or most liked; signed-in players with a username can write
// (280 characters, no links). Depending on the admin's setting, new comments wait for review.
import { useEffect, useRef, useState } from 'react'
import { rpc } from './api'
import { useGameStats } from './gameStats'
import { openSignIn, signedIn } from './auth'
import { useSiteConfig } from './config'
import { load } from './storage'
import { Button, Segmented } from '../ui/components'
import { Avatar } from '../ui/icons'

type C = { id: number; username: string; icon: string; colour: string; body: string; likes: number; liked: boolean; mine: boolean; pending: boolean; created_at: string }
const WHY: Record<string, string> = {
  'comment comments off': 'Comments are switched off right now.',
  'comment banned': 'You can’t comment.',
  'comment no username': 'Pick a username first (on your profile).',
  'comment length': 'Keep it to 280 characters.',
  'comment link': 'Links aren’t allowed in comments.',
  'comment rude': 'Please keep it friendly.',
  'comment too fast': 'One comment a minute, please.',
  'comment too many': 'That’s 10 comments today. More tomorrow.',
}
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`
}

export default function Comments({ game }: { game: string }) {
  const live = useGameStats().live
  const cfg = useSiteConfig()
  const [list, setList] = useState<C[] | null>(null)
  const [sort, setSort] = useState<'new' | 'top'>('new')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [seen, setSeen] = useState(false)
  const box = useRef<HTMLElement>(null)
  const me = signedIn()
  const named = !!load<{ username: string | null } | null>('profile', null)?.username

  // Load once the section comes into view.
  useEffect(() => {
    const el = box.current
    if (!el || seen) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, live])
  const reload = () => rpc<C[]>('game_comments', { p_game: game, p_sort: sort }).then((l) => setList(Array.isArray(l) ? l : []), () => setList([]))
  useEffect(() => { if (seen && cfg.comments !== 'off') void reload() }, [seen, sort, cfg.comments]) // eslint-disable-line react-hooks/exhaustive-deps

  async function post() {
    setBusy(true); setMsg('')
    try {
      const r = await rpc<{ status: string }>('post_comment', { p_game: game, p_body: text.trim() })
      setText('')
      setMsg(r.status === 'pending' ? 'Thanks! Your comment shows once it’s been checked.' : 'Posted.')
      await reload()
    } catch (e) { setMsg(WHY[String((e as Error).message)] ?? 'Couldn’t post it. Try again.') }
    setBusy(false)
  }
  async function like(c: C) {
    setList((l) => l?.map((x) => (x.id === c.id ? { ...x, liked: !c.liked, likes: x.likes + (c.liked ? -1 : 1) } : x)) ?? null)
    await rpc('like_comment', { p_id: c.id, p_on: !c.liked }).catch(() => {})
  }
  async function report(c: C) {
    if (!confirm('Report this comment? Three reports hide it until it’s checked.')) return
    await rpc('report_comment', { p_id: c.id }).then(() => setMsg('Thanks, it’ll be checked.'), () => {})
  }
  async function remove(c: C) {
    if (!confirm('Delete your comment?')) return
    await rpc('remove_my_comment', { p_id: c.id }).catch(() => {})
    void reload()
  }

  if (live === false || cfg.comments === 'off') return null
  return (
    <section ref={box} className="qg-comments" aria-label="Comments">
      <div className="between"><h2 className="card-title" style={{ margin: 0 }}>Comments</h2>
        <Segmented label="Sort comments" value={sort} onChange={setSort} options={[{ value: 'new', label: 'Newest' }, { value: 'top', label: 'Most liked' }]} />
      </div>
      {me && named ? (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void post() }}>
          <label className="eyebrow muted" htmlFor={`comment-${game}`}>Say something about this game</label>
          <textarea id={`comment-${game}`} className="qg-comment-input" value={text} maxLength={280} rows={2} onChange={(e) => setText(e.target.value)} placeholder="Be kind. No links." />
          <div className="between"><span className="small muted">{280 - text.length} left{cfg.comments === 'review' ? ' · checked before it shows' : ''}</span><Button type="submit" disabled={!text.trim() || busy}>Post</Button></div>
        </form>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>
          {me ? 'Pick a username on your profile to comment.' : <><button type="button" className="linkish" onClick={() => openSignIn()}>Sign in</button> to comment.</>}
        </p>
      )}
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      {list == null ? <p className="small muted" style={{ margin: 0 }}>Loading comments…</p> : list.length === 0 ? (
        <p className="small muted" style={{ margin: 0 }}>No comments yet.</p>
      ) : (
        <ul className="qg-comment-list">
          {list.map((c) => (
            <li key={c.id} className={c.pending ? 'is-pending' : undefined}>
              <Avatar icon={c.icon} colour={c.colour} size={32} />
              <div className="qg-comment-main">
                <p className="small" style={{ margin: 0 }}><strong>{c.mine ? 'You' : c.username}</strong> <span className="muted">· {ago(c.created_at)}{c.pending ? ' · waiting to be checked' : ''}</span></p>
                <p className="body" style={{ margin: 0 }}>{c.body}</p>
                <div className="qg-comment-actions">
                  {!c.pending && <button type="button" className="qg-reaction" aria-pressed={c.liked} disabled={!me || c.mine} aria-label={`Like this comment (${c.likes})`} onClick={() => void like(c)}>♥ {c.likes}</button>}
                  {c.mine ? <button type="button" className="linkish small" onClick={() => void remove(c)}>Delete</button>
                    : me && <button type="button" className="linkish small" onClick={() => void report(c)}>Report</button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
