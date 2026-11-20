import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { GameMeta } from '../games/registry'
import { SITE } from '../site'
import { ChallengeBanner, TopBar } from '../ui/components'
import { displayName, myId, readChallenge } from './challenge'
import { dateKey, parseDateKey } from './daily'
import { GameInfo } from './GameInfo'
import { formatCount, SHOW_FROM, useRecentPlays } from './live'
import { AsideContext } from './layout'
import { SiteFooter } from './SiteFooter'
import { AccountKey } from './AccountKey'
import { useSiteConfig } from './config'
import { SiteNotice } from './SiteNotice'
import { gameLine, useGameStats } from './gameStats'
import { lazy, Suspense } from 'react'
// Optional extras: if the piece can't load (offline), the page simply goes without it.
const Comments = lazy(() => import('./Comments').catch(() => ({ default: () => null })))
import { SoundToggle } from './SoundToggle'

/** The comments section's height before it has loaded (its empty state), kept so nothing below it moves. */
const COMMENTS_MIN = 170 // 150 px section + its 20 px top margin

/** Renders its children only once the reader scrolls near (the comments sit below the game). */
function WhenNear({ children, reserve = 1 }: { children: ReactNode; reserve?: number }) {
  const at = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = at.current
    if (!el || near) return
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setNear(true) }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return near ? <>{children}</> : <div ref={at} aria-hidden="true" style={{ height: reserve }} />
}
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
      if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return // a game already handled it
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

  const cfg = useSiteConfig()
  const off = cfg.disabled.includes(game.slug)
  const gs = useGameStats()
  const here = gs.onlineByGame[game.slug] ?? 0
  const numbers = [here >= cfg.counters.gameOnline ? `${here} playing now` : '', gameLine(game.slug, gs, cfg.counters.plays)].filter(Boolean).join(' · ')
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
  } else if (challenge && game.daily && challenge.s !== dateKey()) {
    const day = parseDateKey(challenge.s)
    if (day) banner = `From the archive: the puzzle from ${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. Just for fun: no board, no streak.`
  }

  return (
    <AsideContext.Provider value={aside}>
      <div className="page page--game">
        <TopBar siteName={SITE.name} daily={game.daily} right={<><AccountKey /><SoundToggle /></>} />
        <SiteNotice />
        <div className="game-band" style={{ viewTransitionName: `band-${game.slug}` }} aria-hidden="true" />
        <div className="game-layout">
          <main className="game-main">
            <header className="game-head">
              <h1 className="game-title" style={{ viewTransitionName: `title-${game.slug}` }}>{game.title}</h1>
              <p className="body">{game.instructions}</p>
              {playsHere >= SHOW_FROM && <p className="small muted live-count">{formatCount(playsHere)} games finished in the last 24 hours</p>}
              {numbers && <p className="small muted live-count">{numbers}</p>}
            </header>
            {off ? (
              <div className="qg-stage back-soon" role="status">
                <p className="card-title" style={{ margin: 0 }}>Back soon</p>
                <p className="body" style={{ margin: 0 }}>{game.title} is having a short break. <a href="/">Pick another game</a>.</p>
              </div>
            ) : (
              <>
                {banner && <ChallengeBanner text={banner} color={game.color} />}
                {children}
                <WhenNear reserve={gs.live !== false && cfg.comments !== 'off' ? COMMENTS_MIN : 1}><Suspense fallback={gs.live !== false && cfg.comments !== 'off' ? <div aria-hidden="true" style={{ height: COMMENTS_MIN }} /> : null}><Comments game={game.slug} /></Suspense></WhenNear>
              </>
            )}
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
