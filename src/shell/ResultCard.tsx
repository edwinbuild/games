import { useEffect, useRef, type ReactNode } from 'react'
import { GAMES, type GameMeta } from '../games/registry'
import { SITE } from '../site'
import { Button, Countdown, PlayNext, ResultTicket } from '../ui'
import { puzzleLabel } from './daily'
import { getStats, todaysDailyText } from './stats'
import { feel } from './feel'
import { track } from './track'

type Props = {
  game: GameMeta
  /** The result in the game's units, e.g. "Late by 0.04s". */
  headline: string
  /** One line under it: target, best, streak. */
  detail?: ReactNode
  /** Spoiler-free text that gets shared. The link is added automatically. */
  shareText: string
  /** Score games: replay key. */
  onReplay?: () => void
  replayLabel?: string
  /** Extra controls after sharing (e.g. a practice link). */
  extra?: ReactNode
  /** Send a 'finish' event when shown. Off when re-showing an earlier result. */
  trackFinish?: boolean
  finishData?: Record<string, string | number>
}

/** Pick one other game to suggest; rotates by day. */
function nextGame(current: string) {
  const others = GAMES.filter((g) => g.slug !== current)
  const day = Math.floor(Date.now() / 86_400_000)
  return others[(day + current.length) % others.length]
}

/** The end of every game: the design system's ticket, wired to sharing and tracking. */
export function ResultCard(p: Props) {
  const tracked = useRef(false)
  useEffect(() => {
    if ((p.trackFinish ?? true) && !tracked.current) {
      tracked.current = true
      track('finish', p.game.slug, p.finishData)
      feel.done()
    }
  }, [p.trackFinish, p.game.slug, p.finishData])

  const url = `${typeof location !== 'undefined' ? location.origin : SITE.url}/${p.game.slug}/`
  const next = nextGame(p.game.slug)
  // The chip shows the player's own result for that game, or "New" if they haven't played it.
  const nextScore = (next.daily ? todaysDailyText(next.slug) : getStats(next.slug).bestText) ?? 'New'

  return (
    <div style={{ marginTop: 'var(--space-5)' }}>
      <ResultTicket
        game={p.game.title}
        stamp={p.game.daily ? puzzleLabel() : undefined}
        color={p.game.color}
        headline={p.headline}
        detail={p.detail}
        shareText={p.shareText}
        url={url}
        onShare={(via) => track('share', p.game.slug, { via })}
      >
        {p.onReplay && (
          <Button size="lg" block color={p.game.color} onClick={p.onReplay}>
            {p.replayLabel ?? 'Play again'}
          </Button>
        )}
        {p.game.daily && <Countdown onMidnight={() => location.reload()} />}
        {p.extra}
        <PlayNext
          title={next.title}
          href={`/${next.slug}/`}
          color={next.color}
          sample={nextScore}
          onClick={() => track('play_next', p.game.slug, { to: next.slug })}
        />
        {SITE.supportUrl && (
          <p className="support">
            Enjoying these? <a href={SITE.supportUrl} target="_blank" rel="noopener">Buy me a coffee</a>
          </p>
        )}
      </ResultTicket>
    </div>
  )
}
