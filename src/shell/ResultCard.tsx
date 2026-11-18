import { useEffect, useRef, useState, type ReactNode } from 'react'
import { GAMES, type GameMeta } from '../games/registry'
import { SITE } from '../site'
import { Button, ChallengeBoard, Countdown, PlayNext, ResultTicket, TextField } from '../ui'
import { challengeUrl, displayName, mergeRow, myId, myName, readChallenge, setMyName } from './challenge'
import { puzzleLabel } from './daily'
import { getStats, todaysDailyText } from './stats'
import { CountUp } from './CountUp'
import { feel } from './feel'
import { ResultSlot } from './layout'
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

  const origin = typeof location !== 'undefined' ? location.origin : SITE.url
  const [name, setName] = useState(myName)
  const me = myId()
  const incoming = readChallenge(p.game.slug)
  const others = incoming && incoming.s === p.challenge.seed ? incoming.r : []
  const rows = mergeRow(others, { n: name, i: me, x: p.challenge.score, t: p.challenge.text }, p.challenge.lowerIsBetter)
  const url = challengeUrl(origin, { g: p.game.slug, s: p.challenge.seed, r: rows })
  const hasOthers = rows.some((r) => r.i !== me)
  const next = nextGame(p.game.slug)
  // The chip shows the player's own result for that game, or "New" if they haven't played it.
  const nextScore = (next.daily ? todaysDailyText(next.slug) : getStats(next.slug).bestText) ?? 'New'

  return (
    <ResultSlot scrollIntoView={p.trackFinish ?? true}>
      <ResultTicket
        game={p.game.title}
        stamp={p.game.daily ? puzzleLabel() : undefined}
        color={p.game.color}
        headline={<CountUp text={p.headline} animate={p.trackFinish ?? true} />}
        detail={p.detail}
        shareText={`${p.shareText}\n${hasOthers ? 'Same puzzle. Your turn:' : 'Same puzzle. Beat me:'}`}
        url={url}
        board={hasOthers ? <ChallengeBoard rows={rows.map((r) => ({ name: displayName(r, me), score: r.t, me: r.i === me }))} /> : undefined}
        onShare={(via) => track('share', p.game.slug, { via })}
      >
        <TextField
          id="nickname"
          label="Your name on challenges (optional)"
          value={name}
          placeholder="e.g. Sam (blank shows “A friend”)"
          maxLength={16}
          onChange={(v) => { setName(v); setMyName(v) }}
        />
        {p.onReplay && (
          <Button size="lg" block color={p.game.color} onClick={p.onReplay} data-primary="click" hint="Space">
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
    </ResultSlot>
  )
}
