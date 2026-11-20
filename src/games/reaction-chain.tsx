import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { ResultCard } from '../shell/ResultCard'
import { newSeed, readChallenge } from '../shell/challenge'
import { seededRandom } from '../shell/daily'
import { feel } from '../shell/feel'
import { countPlay, getStats, recordPlay } from '../shell/stats'
import { MIN_CLEAN, PENALTY, ROUNDS, summarize, type Tap } from './reaction-chain/score'
import { AttemptTiles, Score, Stage, type Attempt } from '../ui/components'

const game = getGame('reaction-chain')
/** Faster than this is a guess, not a reaction. */
const GUESS_MS = 100

type Phase = 'idle' | 'waiting' | 'go' | 'between' | 'done'

const grade = (t: Tap): Attempt => (t.early ? 'miss' : t.ms < 250 ? 'hit' : t.ms < 350 ? 'near' : 'miss')
const square = (t: Tap) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(t)]

export default function ReactionChain() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [times, setTimes] = useState<Tap[]>([])
  const [last, setLast] = useState<{ ms: number; early: boolean; guess?: boolean } | null>(null)
  // A challenge link plays its waits first; every other game gets a new seed.
  const challenge = readChallenge(game.slug)
  const [seed, setSeed] = useState(() => challenge?.s ?? newSeed())
  const rng = useRef(seededRandom(seed))
  const goAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function arm() {
    setPhase('waiting')
    timer.current = setTimeout(() => {
      goAt.current = performance.now()
      setPhase('go')
    }, 1200 + rng.current() * 2300)
  }

  function finishRound(ms: number, early: boolean, guess = false) {
    const next = [...times, { ms, early }]
    setTimes(next)
    setLast({ ms, early, guess })
    if (early) feel.bad()
    else feel.good()
    if (next.length >= ROUNDS) {
      const s = summarize(next)
      // Only a run with enough clean taps is a result; otherwise it just counts as played.
      if (s.counts) recordPlay(game.slug, s.avg, (a, b) => a < b, `${s.avg}ms`)
      else countPlay(game.slug)
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
    // Replays always get a new puzzle: replaying a challenge you have now seen would make a memorised run a best.
    const next = newSeed()
    setSeed(next)
    rng.current = seededRandom(next)
    setTimes([])
    setLast(null)
    setPhase('idle')
  }

  const sum = summarize(times)
  const avg = sum.avg
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
    done: sum.counts ? { text: `${avg} ms`, sub: 'average' } : { text: 'Too early', sub: `${sum.clean} clean tap${sum.clean === 1 ? '' : 's'} of ${ROUNDS}` },
  }
  const l = look[phase]

  return (
    <>
      <Stage
        color={l.color}
        role="button"
        tabIndex={0}
        data-primary={phase === 'done' ? undefined : 'pointer'}
        aria-label={l.text}
        onPointerDown={phase === 'done' ? undefined : tap}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && phase !== 'done' && (e.preventDefault(), tap())}
        style={{ minHeight: 300, display: 'grid', alignContent: 'center', gap: 'var(--space-3)', cursor: phase === 'done' ? 'default' : 'pointer', touchAction: 'manipulation' }}
      >
        <Score value={l.text} />
        {l.sub && <p className="small" style={{ margin: 0 }}>{l.sub}</p>}
        {phase !== 'done' && <p className="small" style={{ margin: 0 }}><kbd className="qg-kbd" aria-hidden="true">Space</kbd></p>}
        <div className="row">
          <AttemptTiles attempts={Array.from({ length: ROUNDS }, (_, i) => (i < times.length ? grade(times[i]) : 'empty'))} />
        </div>
      </Stage>

      {phase === 'done' && (
        <ResultCard
          game={game}
          headline={sum.counts ? `${avg} ms average` : 'Too many early taps'}
          detail={sum.counts
            ? `Fastest round ${sum.fastest} ms${best != null && best < avg ? ` · your best average ${best} ms` : ''}`
            : `Only ${sum.clean} of ${ROUNDS} taps came after green. A run needs at least ${MIN_CLEAN} to count.`}
          shareText={`⚡ Reaction Chain\n${times.map(square).join('')} ${sum.counts ? `${avg} ms average` : 'too many early taps'}`}
          finishData={{ avg, clean: sum.clean }}
          challenge={{ seed, score: sum.counts ? avg : 9999, text: sum.counts ? `${avg} ms` : 'No result', lowerIsBetter: true }}
          onReplay={reset}
        />
      )}
    </>
  )
}
