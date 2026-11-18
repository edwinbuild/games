import { useEffect, type ReactNode } from 'react'
import type { GameMeta } from '../games/registry'
import { SITE } from '../site'
import { ChallengeBanner, TopBar } from '../ui'
import { displayName, myId, readChallenge } from './challenge'
import { dateKey, parseDateKey } from './daily'
import { SiteFooter } from './SiteFooter'
import { SoundToggle } from './SoundToggle'
import { track } from './track'

/** Page frame shared by every game: top bar, title, one line of instructions. */
export function GameShell({ game, children }: { game: GameMeta; children: ReactNode }) {
  useEffect(() => {
    track('start', game.slug)
  }, [game.slug])

  const challenge = readChallenge(game.slug)
  const me = myId()
  const others = challenge ? challenge.r.filter((r) => r.i !== me) : []
  let banner: string | null = null
  if (challenge && others.length) {
    const best = others[0]
    const day = game.daily ? parseDateKey(challenge.s) : null
    const when = day && challenge.s !== dateKey()
      ? ` (the puzzle from ${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`
      : ''
    banner =
      others.length === 1
        ? `${displayName(best, me)} got ${best.t}. Same puzzle${when}, your turn.`
        : `${others.length} friends have played. Best so far: ${displayName(best, me)}, ${best.t}. Same puzzle${when}, your turn.`
  }

  return (
    <div className="page">
      <TopBar siteName={SITE.name} daily={game.daily} right={<SoundToggle />} />
      <main>
        <header className="game-head">
          <h1 className="game-title">{game.title}</h1>
          <p className="body">{game.instructions}</p>
        </header>
        {banner && <ChallengeBanner text={banner} color={game.color} />}
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
