// Under a signed-in player's daily result: how their friends did today, with reactions.
import { useEffect, useState } from 'react'
import { rpc } from './api'
import { Avatar } from '../ui/icons'

type Row = { username: string; icon: string; colour: string; text: string; rank: number; mine: boolean; reactions: Record<string, number>; my_reaction: string | null }
const EMOJI = ['👏', '🔥', '😮', '😂']

export default function FriendsToday({ game, day, after }: { game: string; day: string; after: unknown }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const load = () => rpc<Row[]>('friends_results', { p_game: game, p_day: day }).then(setRows, () => setRows(null))
  // Read after this result is on the board (`after` changes once it's sent).
  useEffect(() => { void load() }, [game, day, after]) // eslint-disable-line react-hooks/exhaustive-deps
  async function react(r: Row, e: string) {
    const next = r.my_reaction === e ? null : e
    setRows((rs) => rs?.map((x) => (x === r ? { ...x, my_reaction: next } : x)) ?? null)
    await rpc('react', { p_name: r.username, p_game: game, p_day: day, p_emoji: next }).catch(() => {})
    void load()
  }
  if (!rows || rows.filter((r) => !r.mine).length === 0) return null
  return (
    <section className="qg-board qg-friends-today" aria-label="Friends today">
      <p className="qg-board-line"><strong>Friends today</strong></p>
      <ol className="qg-board-list">
        {rows.map((r) => (
          <li key={r.username} className={r.mine ? 'is-me' : undefined}>
            <span className="qg-board-rank">{r.rank}</span>
            <span className="qg-board-name"><Avatar icon={r.icon} colour={r.colour} size={22} />{r.mine ? 'You' : r.username}</span>
            <span className="qg-board-score">{r.text}</span>
            <span className="qg-reactions">
              {r.mine
                ? Object.entries(r.reactions).map(([e, n]) => <span key={e} className="qg-reaction is-static">{e} {n}</span>)
                : EMOJI.map((e) => (
                    <button key={e} type="button" className="qg-reaction" aria-pressed={r.my_reaction === e} aria-label={`React ${e} to ${r.username}`} onClick={() => void react(r, e)}>
                      {e}{r.reactions[e] ? ` ${r.reactions[e]}` : ''}
                    </button>
                  ))}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
