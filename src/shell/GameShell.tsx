import { useEffect, type ReactNode } from 'react'
import type { GameMeta } from '../games/registry'
import { SITE } from '../site'
import { track } from './track'

/** Page frame shared by every game: header, title, one line of instructions. */
export function GameShell({ game, children }: { game: GameMeta; children: ReactNode }) {
  useEffect(() => {
    track('start', game.slug)
  }, [game.slug])

  return (
    <div className="shell">
      <header className="topbar">
        <a href="/" className="brand">
          {SITE.name}
        </a>
        {game.daily && <span className="pill">Daily</span>}
      </header>
      <main className="game">
        <h1>
          <span aria-hidden="true">{game.emoji}</span> {game.title}
        </h1>
        <p className="instructions">{game.instructions}</p>
        {children}
      </main>
    </div>
  )
}
