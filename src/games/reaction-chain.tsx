import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { ResultCard } from '../shell/ResultCard'
import { feel } from '../shell/feel'
import { getStats, recordPlay } from '../shell/stats'
import { AttemptTiles, Score, Stage, type Attempt } from '../ui'

const game = getGame('reaction-chain')
const ROUNDS = 5
const PENALTY = 500
/** Faster than this is a guess, not a reaction. */
const GUESS_MS = 100

type Phase = 'idle' | 'waiting' | 'go' | 'between' | 'done'

const grade = (ms: number): Attempt => (ms < 250 ? 'hit' : ms < 350 ? 'near' : 'miss')
const square = (ms: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(ms)]

export default function ReactionChain() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [times, setTimes] = useState<number[]>([])
  const [last, setLast] = useState<{ ms: number; early: boolean; guess?: boolean } | null>(null)
  const goAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function arm() {
    setPhase('waiting')
    timer.current = setTimeout(() => {
      goAt.current = performance.now()
      setPhase('go')
    }, 1200 + Math.random() * 2300)
  }

  function finishRound(ms: number, early: boolean, guess = false) {
    const next = [...times, ms]
    setTimes(next)
    setLast({ ms, early, guess })
    if (early) feel.bad()
    else feel.good()
    if (next.length >= ROUNDS) {
      const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length)
      recordPlay(game.slug, avg, (a, b) => a < b, `${avg}ms`)
      setPhase('done')
    } else {
      setPhase('between')
    }
  }

  function tap() {
    if (phase === 'idle' || phase === 'between') arm()
    else if (phase === 'waiting') {
      clearTimeout(timer.current)
      finishRound(PENALTY, true)
    } else if (phase === 'go') {
      const ms = Math.round(performance.now() - goAt.current)
      if (ms < GUESS_MS) finishRound(PENALTY, true, true)
      else finishRound(ms, false)
    }
  }

  function reset() {
    setTimes([])
    setLast(null)
    setPhase('idle')
  }

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  const best = getStats(game.slug).best

  const look: Record<Phase, { color?: string; text: string; sub: string }> = {
    idle: { text: 'Tap to start', sub: `Round 1 of ${ROUNDS}` },
    waiting: { color: 'chili', text: 'Wait…', sub: 'Tap when it turns green' },
    go: { color: 'mint', text: 'TAP!', sub: '' },
    between: {
      text: last?.guess ? 'Guessed' : last?.early ? 'Too early' : `${last?.ms} ms`,
      sub: last?.early
        ? `${last.guess ? `Under ${GUESS_MS} ms is a guess.` : 'It was still red.'} Counts as ${PENALTY} ms. Tap for the next round.`
        : 'Tap for the next round',
    },
    done: { text: `${avg} ms`, sub: 'average' },
  }
  const l = look[phase]

  return (
    <>
      <Stage
        color={l.color}
        role="button"
        tabIndex={0}
        aria-label={l.text}
        onPointerDown={phase === 'done' ? undefined : tap}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && phase !== 'done' && (e.preventDefault(), tap())}
        style={{ minHeight: 300, display: 'grid', alignContent: 'center', gap: 'var(--space-3)', cursor: phase === 'done' ? 'default' : 'pointer', touchAction: 'manipulation' }}
      >
        <Score value={l.text} />
        {l.sub && <p className="small" style={{ margin: 0 }}>{l.sub}</p>}
        <div className="row">
          <AttemptTiles attempts={Array.from({ length: ROUNDS }, (_, i) => (i < times.length ? grade(times[i]) : 'empty'))} />
        </div>
      </Stage>

      {phase === 'done' && (
        <ResultCard
          game={game}
          headline={`${avg} ms average`}
          detail={`Fastest round ${Math.min(...times)} ms${best != null && best < avg ? ` · your best average ${best} ms` : best === avg && getStats(game.slug).plays > 1 ? ' · a new best' : ''}`}
          shareText={`⚡ Reaction Chain\n${times.map(square).join('')} ${avg} ms average`}
          finishData={{ avg }}
          onReplay={reset}
        />
      )}
    </>
  )
}
