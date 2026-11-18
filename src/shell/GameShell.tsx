import { useEffect, type ReactNode } from 'react'
import type { GameMeta } from '../games/registry'
import { SITE } from '../site'
import { TopBar } from '../ui'
import { track } from './track'

/** Page frame shared by every game: top bar, title, one line of instructions. */
export function GameShell({ game, children }: { game: GameMeta; children: ReactNode }) {
  useEffect(() => {
    track('start', game.slug)
  }, [game.slug])

  return (
    <div className="page">
      <TopBar siteName={SITE.name} daily={game.daily} />
      <main>
        <header className="game-head">
          <h1 className="game-title">{game.title}</h1>
          <p className="body">{game.instructions}</p>
        </header>
        {children}
      </main>
    </div>
  )
}
