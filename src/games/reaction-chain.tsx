import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { ResultCard } from '../shell/ResultCard'
import { getStats, recordPlay } from '../shell/stats'

const game = getGame('reaction-chain')
const ROUNDS = 5
const PENALTY = 500

type Phase = 'idle' | 'waiting' | 'go' | 'between' | 'done'

const square = (ms: number) => (ms < 250 ? '🟩' : ms < 350 ? '🟨' : '🟥')

export default function ReactionChain() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [times, setTimes] = useState<number[]>([])
  const [last, setLast] = useState<{ ms: number; early: boolean } | null>(null)
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

  function finishRound(ms: number, early: boolean) {
    const next = [...times, ms]
    setTimes(next)
    setLast({ ms, early })
    if (next.length >= ROUNDS) {
      const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length)
      recordPlay(game.slug, avg, (a, b) => a < b)
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
    } else if (phase === 'go') finishRound(Math.round(performance.now() - goAt.current), false)
  }

  function reset() {
    setTimes([])
    setLast(null)
    setPhase('idle')
  }

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  const best = getStats(game.slug).best

  const look: Record<Phase, { bg: string; text: string; sub: string }> = {
    idle: { bg: 'var(--surface)', text: 'Tap to start', sub: `${ROUNDS} rounds` },
    waiting: { bg: '#dc2626', text: 'Wait for green…', sub: '' },
    go: { bg: '#16a34a', text: 'TAP!', sub: '' },
    between: {
      bg: 'var(--surface)',
      text: last?.early ? 'Too early!' : `${last?.ms} ms`,
      sub: last?.early ? `+${PENALTY} ms penalty · tap for next round` : 'Tap for next round',
    },
    done: { bg: 'var(--surface)', text: `${avg} ms`, sub: 'average' },
  }
  const l = look[phase]

  return (
    <>
      <div
        className="stage"
        role="button"
        tabIndex={0}
        onPointerDown={phase === 'done' ? undefined : tap}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && phase !== 'done' && (e.preventDefault(), tap())}
        style={{
          background: l.bg,
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          cursor: phase === 'done' ? 'default' : 'pointer',
          color: phase === 'waiting' || phase === 'go' ? '#fff' : undefined,
          touchAction: 'manipulation',
        }}
      >
        <p className="big-number" style={{ margin: 0 }}>{l.text}</p>
        {l.sub && <p style={{ margin: '8px 0 0', opacity: 0.8 }}>{l.sub}</p>}
        <p className="label" style={{ margin: '16px 0 0', color: 'inherit', opacity: 0.8 }}>
          {times.map(square).join(' ') || ' '}
        </p>
      </div>

      {phase === 'done' && (
        <ResultCard
          game={game}
          headline={`${avg} ms average`}
          detail={best != null ? `Your best average: ${best} ms` : undefined}
          shareText={`⚡ Reaction Chain\n${times.map(square).join('')} ${avg} ms average`}
          finishData={{ avg }}
          onReplay={reset}
        />
      )}
    </>
  )
}
