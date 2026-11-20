// Today's board under a daily result: your rank and percentile, and the top 50 on request.
// Loaded on its own (after the ticket), so the code every page loads stays small.
import { lazy, Suspense, useEffect, useState } from 'react'
import { boardsOn, dailyBoard, myRank, submitScore, type BoardRow, type Rank } from './board'
import { myName } from './challenge'
import { signedIn } from './auth'
import { load } from './storage'
import { Avatar } from '../ui/icons'

const FriendsToday = lazy(() => import('./FriendsToday'))
const ordinal = (n: number) => `#${n.toLocaleString('en')}`

export default function DailyBoard({ game, day, score, text, submit }: { game: string; day: string; score: number; text: string; submit: boolean }) {
  const [rank, setRank] = useState<Rank | null>(null)
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!boardsOn()) return
    // A new result is sent (the server keeps your best); reopening only reads your place.
    ;(submit ? submitScore(game, day, score, text, myName()) : myRank(game, day)).then(setRank, () => setFailed(true))
  }, [game, day, score, text, submit])

  function toggle() {
    setOpen(!open)
    if (!rows) dailyBoard(game, day).then(setRows, () => setFailed(true))
  }

  if (!boardsOn() || failed || !rank || rank.rank == null) return null
  const alone = rank.total < 2
  return (
    <>
    {signedIn() && <Suspense fallback={null}><FriendsToday game={game} day={day} after={rank} /></Suspense>}
    <section className="qg-board" aria-label="Today's board">
      <p className="qg-board-line">
        {alone ? (
          <>You’re first on today’s board. Others will join through the day.</>
        ) : (
          <>You’re <strong>{ordinal(rank.rank)}</strong> of {rank.total.toLocaleString('en')} today{rank.better_than != null && <>, better than <strong>{rank.better_than}%</strong></>}.</>
        )}
      </p>
      {!alone && (
        <button type="button" className="linkish qg-board-toggle" aria-expanded={open} onClick={toggle}>
          {open ? 'Hide today’s top 50' : 'See today’s top 50'}
        </button>
      )}
      {open && (
        rows ? (
          <ol className="qg-board-list">
            {rows.map((r, i) => (
              <li key={i} className={r.mine ? 'is-me' : undefined}>
                <span className="qg-board-rank">{r.rank}</span>
                <span className="qg-board-name">{r.icon ? <Avatar icon={r.icon} colour={r.colour} size={22} /> : null}{r.mine ? 'You' : r.nick || 'A player'}</span>
                <span className="qg-board-score">{r.text}</span>
              </li>
            ))}
          </ol>
        ) : <p className="small muted" style={{ margin: 0 }}>Loading the board…</p>
      )}
      <p className="small muted" style={{ margin: 0 }}>
        {signedIn() ? <>You’re on the board as {load<{ username: string | null } | null>('profile', null)?.username ?? 'your username'}.</> : <>Your name on the board is the one you set for challenges; without one you’re “A player”. Sign in for a username and an icon.</>}
      </p>
    </section>
    </>
  )
}
