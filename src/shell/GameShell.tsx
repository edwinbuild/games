import { useEffect, useState, type ReactNode } from 'react'
import type { GameMeta } from '../games/registry'
import { SITE } from '../site'
import { ChallengeBanner, TopBar } from '../ui'
import { displayName, myId, readChallenge } from './challenge'
import { dateKey, parseDateKey } from './daily'
import { GameInfo } from './GameInfo'
import { formatCount, SHOW_FROM, useRecentPlays } from './live'
import { AsideContext } from './layout'
import { SiteFooter } from './SiteFooter'
import { SoundToggle } from './SoundToggle'
import { track } from './track'

/** Page frame shared by every game: top bar, title, one line of instructions. */
export function GameShell({ game, children }: { game: GameMeta; children: ReactNode }) {
  const [aside, setAside] = useState<HTMLElement | null>(null)
  useEffect(() => {
    track('start', game.slug)
  }, [game.slug])

  // Space or Enter triggers the game's main action (marked data-primary), unless typing or on a control.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== ' ' && e.key !== 'Enter') return
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && t.closest('input, textarea, select, button, a, [role="button"]')) return
      const el =
        document.querySelector<HTMLElement>('.game-main [data-primary]:not([disabled])') ??
        document.querySelector<HTMLElement>('.result-slot [data-primary]:not([disabled])')
      if (!el) return
      e.preventDefault()
      if (el.dataset.primary === 'pointer') el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      else el.click()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const recent = useRecentPlays()
  const playsHere = recent?.[game.slug] ?? 0
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
    <AsideContext.Provider value={aside}>
      <div className="page page--game">
        <TopBar siteName={SITE.name} daily={game.daily} right={<SoundToggle />} />
        <div className="game-band" style={{ viewTransitionName: `band-${game.slug}` }} aria-hidden="true" />
        <div className="game-layout">
          <main className="game-main">
            <header className="game-head">
              <h1 className="game-title" style={{ viewTransitionName: `title-${game.slug}` }}>{game.title}</h1>
              <p className="body">{game.instructions}</p>
              {playsHere >= SHOW_FROM && <p className="small muted live-count">{formatCount(playsHere)} games finished in the last 24 hours</p>}
            </header>
            {banner && <ChallengeBanner text={banner} color={game.color} />}
            {children}
          </main>
          <aside className="game-aside" ref={setAside} aria-label="Result and how to play">
            <GameInfo game={game} />
          </aside>
        </div>
        <SiteFooter />
      </div>
    </AsideContext.Provider>
  )
}
