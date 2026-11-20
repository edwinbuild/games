// "Did you enjoy it?" 👍 / 👎 under a result. One vote per player per game, changeable.
import { useEffect, useState } from 'react'
import { rpc } from './api'
import { useGameStats } from './gameStats'
import { boardKey } from './board'
import { feel } from './feel'

export default function Vote({ game }: { game: string }) {
  const live = useGameStats().live
  const [vote, setVote] = useState<number | null>(null)
  const [thanks, setThanks] = useState(false)
  useEffect(() => { rpc<number>('my_game_vote', { p_game: game, p_key: boardKey() }).then((v) => setVote(typeof v === 'number' ? v : 0), () => setVote(0)) }, [game])
  async function cast(v: number) {
    const next = vote === v ? 0 : v
    const before = vote
    setVote(next)
    feel.tap()
    try { await rpc('vote_game', { p_game: game, p_key: boardKey(), p_vote: next }); setThanks(next !== 0) } catch { setVote(before) }
  }
  if (!live || vote == null) return null
  return (
    <div className="qg-vote" role="group" aria-label="Did you enjoy it?">
      <span className="small">{thanks ? 'Thanks for telling us!' : 'Did you enjoy it?'}</span>
      <button type="button" className="qg-vote-key" aria-pressed={vote === 1} aria-label="Yes, I enjoyed it" onClick={() => void cast(1)}>👍</button>
      <button type="button" className="qg-vote-key" aria-pressed={vote === -1} aria-label="Not really" onClick={() => void cast(-1)}>👎</button>
    </div>
  )
}
