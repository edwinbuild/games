import type { GameMeta } from '../games/registry'
import { getStats } from './stats'

/** Side-column panel before a result exists: how to play and the player's own record. Wide screens only. */
export function GameInfo({ game }: { game: GameMeta }) {
  const s = getStats(game.slug)
  const record = [
    s.plays > 0 && !game.daily ? `${s.plays} ${s.plays === 1 ? 'game' : 'games'} played` : null,
    s.bestText && !game.daily ? `best ${s.bestText}` : null,
    game.daily && s.streak > 0 ? `${s.streak} day streak` : null,
    game.daily && s.maxStreak > 1 ? `longest ${s.maxStreak} days` : null,
  ].filter(Boolean)
  return (
    <section className="game-info" aria-labelledby="info-title">
      <h2 id="info-title" className="card-title">How to play</h2>
      {game.howTo.map((p, i) => (
        <p key={i} className="body muted">{p}</p>
      ))}
      <p className="eyebrow muted">Your record</p>
      <p className="body-strong">{record.length ? record.join(' · ') : 'Nothing yet. Your results stay in this browser.'}</p>
    </section>
  )
}
