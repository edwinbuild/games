// Friends on the profile page: what's new (game invites, reactions), requests to answer, your
// friends with their streaks, adding by exact username or invite link, blocking, and inviting a
// friend into an online room. Signed-in players only; loaded with the profile page.
import { useEffect, useState } from 'react'
import { rpc } from './api'
import type { Profile } from './account'
import { refreshProfile } from './account'
import { dateKey } from './daily'
import { GAMES } from '../games/registry'
import { Button, TextField } from '../ui/components'
import { Avatar } from '../ui/icons'
import { FriendRow } from '../ui/FriendRow'

export type Friend = { username: string; icon: string; colour: string; status: 'friend' | 'incoming' | 'outgoing'; played_today: number; streak: number }
type Inbox = {
  invites: { username: string; icon: string; colour: string; game: string; room: string; at: string }[]
  reactions: { username: string; icon: string; colour: string; emoji: string; game: string; day: string }[]
}
const ONLINE = ['dots-and-boxes', 'reaction-online', 'spot-race', 'higher-lower', 'quick-draw']
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const newRoom = () => Array.from({ length: 5 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('')

const WHY: Record<string, string> = {
  'no such player': 'No player has that exact username.',
  'that is you': 'That’s you!',
  'too many pending': 'You have 30 requests waiting for an answer. Cancel some first.',
  'too many today': 'That’s 20 new requests today. Try again tomorrow.',
  'no such invite': 'That invite link doesn’t work any more.',
}
const titleOf = (slug: string) => GAMES.find((g) => g.slug === slug)?.title ?? slug
const why = (e: unknown) => WHY[String((e as Error)?.message ?? e)] ?? 'Something went wrong. Try again.'


export default function Friends({ profile }: { profile: Profile | null }) {
  const [list, setList] = useState<Friend[] | null>(null)
  const [inbox, setInbox] = useState<Inbox | null>(null)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [invite, setInvite] = useState<{ code: string; owner: { username: string; icon: string; colour: string; self: boolean; friends: boolean } | null } | null>(null)
  const [playWith, setPlayWith] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)

  const load = () => rpc<Friend[]>('my_friends', { p_today: dateKey() }).then(setList, () => setList([]))
  useEffect(() => {
    void load()
    rpc<Inbox>('my_inbox').then((i) => { setInbox(i); if (i.reactions.length || i.invites.length) void rpc('mark_seen').then(() => refreshProfile()).catch(() => {}) }, () => {})
    // Arrived through someone's invite link (/me/?invite=CODE): show who before adding.
    const code = new URLSearchParams(location.search).get('invite')
    if (code && /^[a-f0-9]{10}$/.test(code)) rpc<Inbox['invites'][0] & { self: boolean; friends: boolean } | null>('invite_owner', { p_code: code }).then((owner) => setInvite({ code, owner }), () => setInvite({ code, owner: null }))
  }, [])

  async function act(fn: string, args: Record<string, unknown>, done?: string) {
    setMsg('')
    try {
      const r = await rpc<string>(fn, args)
      if (fn === 'friend_request') setMsg(r === 'friends' ? `You and ${args.p_name} are now friends.` : `Request sent to ${args.p_name}.`)
      else if (done) setMsg(done)
      // A block also removes their game invites and reactions.
      if (fn === 'block_player') setInbox((i) => i && { invites: i.invites.filter((x) => x.username !== args.p_name), reactions: i.reactions.filter((x) => x.username !== args.p_name) })
      setName('')
      setMenu(null)
      await load()
      void refreshProfile().catch(() => {})
    } catch (e) {
      setMsg(why(e))
    }
  }
  async function acceptInvite() {
    if (!invite) return
    try {
      await rpc('friend_by_invite', { p_code: invite.code })
      setMsg(`You and ${invite.owner?.username} are now friends.`)
      setInvite(null)
      history.replaceState(null, '', location.pathname)
      await load()
    } catch (e) {
      setMsg(why(e))
    }
  }
  async function play(friend: string, game: string) {
    const room = newRoom()
    try {
      await rpc('invite_to_play', { p_name: friend, p_game: game, p_room: room })
      location.href = `/${game}/?room=${room}`
    } catch (e) {
      setMsg(why(e))
    }
  }
  const link = profile ? `${location.origin}/me/?invite=${profile.inviteCode}` : ''
  async function shareLink() {
    const text = `Add me on ${document.title.split('|').pop()?.trim() || 'Pocket Fair'}: I'm ${profile?.username ?? 'here'}`
    try {
      if (navigator.share) await navigator.share({ text, url: link })
      else { await navigator.clipboard.writeText(link); setMsg('Invite link copied.') }
    } catch { /* closed the share sheet */ }
  }

  const incoming = list?.filter((f) => f.status === 'incoming') ?? []
  const friends = list?.filter((f) => f.status === 'friend') ?? []
  const outgoing = list?.filter((f) => f.status === 'outgoing') ?? []
  return (
    <section className="stack me-friends" aria-label="Friends">
      <h2 className="card-title" style={{ margin: 0 }}>Friends</h2>
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}

      {invite && (
        invite.owner && !invite.owner.self && !invite.owner.friends ? (
          <div className="acct-prompt">
            <span className="acct-hello"><Avatar icon={invite.owner.icon} colour={invite.owner.colour} size={36} /><span className="body"><strong>{invite.owner.username}</strong> invited you to be friends.</span></span>
            <Button onClick={() => void acceptInvite()}>Add {invite.owner.username}</Button>
          </div>
        ) : <p className="small muted" style={{ margin: 0 }}>{invite.owner?.self ? 'That’s your own invite link. Send it to a friend.' : invite.owner?.friends ? `You and ${invite.owner.username} are already friends.` : 'That invite link doesn’t work any more.'}</p>
      )}

      {!!inbox?.invites.length && (
        <ul className="qg-friends">
          {inbox.invites.map((i) => (
            <FriendRow key={i.username + i.room} f={{ ...i, detail: `invited you to ${titleOf(i.game)}` }}>
              <a className="qg-btn-link" href={`/${i.game}/?room=${i.room}`}>Join</a>
            </FriendRow>
          ))}
        </ul>
      )}
      {!!inbox?.reactions.length && (
        <p className="small" style={{ margin: 0 }}>
          {inbox.reactions.slice(0, 5).map((r, k) => <span key={k}>{k ? ' · ' : ''}{r.username} reacted {r.emoji} to your {titleOf(r.game)}</span>)}
        </p>
      )}

      {incoming.length > 0 && (
        <>
          <h3 className="eyebrow muted" style={{ margin: 0 }}>Requests</h3>
          <ul className="qg-friends">
            {incoming.map((f) => (
              <FriendRow key={f.username} f={{ ...f, detail: 'wants to be friends' }}>
                <Button onClick={() => void act('friend_respond', { p_name: f.username, p_accept: true }, `You and ${f.username} are now friends.`)}>Accept</Button>
                <Button variant="ghost" onClick={() => void act('friend_respond', { p_name: f.username, p_accept: false }, 'Request declined.')}>Decline</Button>
              </FriendRow>
            ))}
          </ul>
        </>
      )}

      {list == null ? <p className="small muted" style={{ margin: 0 }}>Loading friends…</p> : friends.length === 0 && incoming.length === 0 ? (
        <p className="body muted" style={{ margin: 0 }}>No friends yet. Add someone by their exact username, or send them your invite link.</p>
      ) : (
        <ul className="qg-friends">
          {friends.map((f) => (
            <FriendRow key={f.username} f={{ ...f, detail: `${f.played_today ? `${f.played_today} played today` : 'Not played today'}${f.streak > 1 ? ` · ${f.streak} day streak` : ''}` }}>
              <Button variant="secondary" onClick={() => setPlayWith(playWith === f.username ? null : f.username)} aria-expanded={playWith === f.username}>Play</Button>
              <button type="button" className="qg-friend-more" aria-label={`More for ${f.username}`} aria-expanded={menu === f.username} onClick={() => setMenu(menu === f.username ? null : f.username)}>⋯</button>
              {playWith === f.username && (
                <span className="qg-friend-menu">
                  {ONLINE.map((g) => <button key={g} type="button" className="linkish" onClick={() => void play(f.username, g)}>{titleOf(g)}</button>)}
                </span>
              )}
              {menu === f.username && (
                <span className="qg-friend-menu">
                  <button type="button" className="linkish" onClick={() => void act('friend_remove', { p_name: f.username }, `Removed ${f.username}.`)}>Remove friend</button>
                  <button type="button" className="linkish" onClick={() => void act('block_player', { p_name: f.username }, `Blocked ${f.username}. They can’t find you or see you on boards.`)}>Block</button>
                  <button type="button" className="linkish" onClick={() => void act('report_username', { p_name: f.username }, `Thanks. ${f.username}’s name will be reviewed.`)}>Report username</button>
                </span>
              )}
            </FriendRow>
          ))}
        </ul>
      )}
      {outgoing.length > 0 && (
        <ul className="qg-friends">
          {outgoing.map((f) => (
            <FriendRow key={f.username} f={{ ...f, detail: 'request sent' }}>
              <Button variant="ghost" onClick={() => void act('friend_remove', { p_name: f.username }, 'Request cancelled.')}>Cancel</Button>
            </FriendRow>
          ))}
        </ul>
      )}

      <form className="row me-add" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void act('friend_request', { p_name: name.trim() }) }}>
        <TextField id="add-friend" label="Add by exact username" value={name} onChange={(v) => setName(v.replace(/\s/g, '').slice(0, 16))} placeholder="e.g. Sam_42" autoComplete="off" />
        <Button type="submit" disabled={name.trim().length < 3}>Add</Button>
      </form>
      {profile && (
        <div className="row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="secondary" onClick={() => void shareLink()}>Share my invite link</Button>
          <span className="small muted">Anyone who opens it can add you in one tap.</span>
        </div>
      )}
    </section>
  )
}
