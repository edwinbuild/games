import { GAMES } from '../games/registry'
import { track } from './track'

/** Suggest one other game. Rotates by day so it doesn't always pick the same. */
export function PlayNext({ current }: { current: string }) {
  const others = GAMES.filter((g) => g.slug !== current)
  if (others.length === 0) return null
  const day = Math.floor(Date.now() / 86_400_000)
  const next = others[(day + current.length) % others.length]
  return (
    <a
      className="play-next"
      href={`/${next.slug}/`}
      style={{ ['--next' as string]: next.color }}
      onClick={() => track('play_next', current, { to: next.slug })}
    >
      <span className="play-next-label">Play next</span>
      <span className="play-next-title">
        {next.emoji} {next.title}
      </span>
      <span className="play-next-tag">{next.tagline}</span>
    </a>
  )
}
