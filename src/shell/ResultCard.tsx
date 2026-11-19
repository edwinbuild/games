import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { LISTED, type GameMeta } from '../games/registry'
import { SITE } from '../site'
import { Burst, Button, ChallengeBoard, Countdown, PlayNext, ResultTicket, TextField } from '../ui'
import { challengeUrl, displayName, mergeRow, myId, myName, readChallenge, setMyName } from './challenge'
import { BOARD_GAMES } from './board'
import { dateKey, puzzleLabel } from './daily'
import { countPlay, getStats, takeNewBest, todaysDailyText } from './stats'
import { CountUp } from './CountUp'
import { feel } from './feel'
import { bringGameIntoView, ResultSlot } from './layout'
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
  /** Makes the share link a challenge: the puzzle seed and this result. */
  challenge: { seed: string; score: number; text: string; lowerIsBetter: boolean }
  /** Online games: share a plain link to the game instead of a challenge (no board, no name field). */
  plainLink?: boolean
}

// Today's board loads on its own, after the ticket.
const DailyBoard = lazy(() => import('./DailyBoard'))

/** Pick one other game to suggest; rotates by day. */
function nextGame(current: string) {
  const others = LISTED.filter((g) => g.slug !== current)
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
      // Counted on the page so tests can check that reopening a result never sends another finish.
      const root = document.documentElement.dataset
      root.finishes = String(Number(root.finishes ?? 0) + 1)
      // Multiplayer games have no personal score to keep, but every finished match counts as played.
      if (p.game.players && p.game.players !== 1) countPlay(p.game.slug)
      feel.click()
      feel.done()
    }
  }, [p.trackFinish, p.game.slug, p.finishData])

  // A new personal best gets a burst on the headline. Games may record the result in their own
  // effect, which runs after this one, so look a moment later.
  const [newBest, setNewBest] = useState(false)
  useEffect(() => {
    if (!(p.trackFinish ?? true)) return
    const t = setTimeout(() => {
      if (takeNewBest(p.game.slug)) {
        setNewBest(true)
        feel.success()
      }
    }, 60)
    return () => clearTimeout(t)
  }, [p.trackFinish, p.game.slug])

  const origin = typeof location !== 'undefined' ? location.origin : SITE.url
  const [name, setName] = useState(myName)
  const me = myId()
  const incoming = readChallenge(p.game.slug)
  const others = incoming && incoming.s === p.challenge.seed ? incoming.r : []
  const rows = mergeRow(others, { n: name, i: me, x: p.challenge.score, t: p.challenge.text }, p.challenge.lowerIsBetter)
  const url = p.plainLink ? `${origin}/${p.game.slug}/` : challengeUrl(origin, { g: p.game.slug, s: p.challenge.seed, r: rows })
  const hasOthers = !p.plainLink && rows.some((r) => r.i !== me)
  const next = nextGame(p.game.slug)
  // The chip shows the player's own result for that game, or "New" if they haven't played it.
  const nextScore = (next.daily ? todaysDailyText(next.slug) : getStats(next.slug).bestText) ?? 'New'

  return (
    <ResultSlot scrollIntoView={p.trackFinish ?? true}>
      <ResultTicket
        game={p.game.title}
        stamp={p.game.daily ? puzzleLabel() : undefined}
        color={p.game.color}
        headline={<span className="qg-best-anchor"><CountUp text={p.headline} animate={p.trackFinish ?? true} onDone={() => feel.tick(6)} />{newBest && <Burst color={p.game.color} />}</span>}
        detail={newBest ? (p.detail ? <>New personal best · {p.detail}</> : 'New personal best') : p.detail}
        shareText={p.plainLink ? p.shareText : `${p.shareText}\n${hasOthers ? 'Same puzzle. Your turn:' : 'Same puzzle. Beat me:'}`}
        url={url}
        board={hasOthers ? <ChallengeBoard rows={rows.map((r) => ({ name: displayName(r, me), score: r.t, me: r.i === me }))} /> : undefined}
        onShare={(via) => track('share', p.game.slug, { via })}
      >
        {!p.plainLink && <TextField
          id="nickname"
          label="Your name on challenges and boards (optional)"
          value={name}
          placeholder="e.g. Sam (blank shows “A friend”)"
          maxLength={16}
          onChange={(v) => { setName(v); setMyName(v) }}
        />}
        {p.onReplay && (
          <Button
            size="lg"
            block
            color={p.game.color}
            onClick={() => {
              track('start', p.game.slug) // each replay is a new game, so finish rate stays honest
              p.onReplay?.()
              bringGameIntoView()
            }}
            data-primary="click"
            hint="Space"
          >
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
      {/* Daily games: today's board (not for another day's puzzle from a challenge link, nor a spilled day). */}
      {p.game.daily && BOARD_GAMES.has(p.game.slug) && p.challenge.seed === dateKey() && p.challenge.text !== 'Spilled' && (
        <Suspense fallback={null}>
          <DailyBoard game={p.game.slug} day={p.challenge.seed} score={p.challenge.score} text={p.challenge.text} submit={p.trackFinish ?? true} />
        </Suspense>
      )}
    </ResultSlot>
  )
}
