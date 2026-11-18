import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { pull, tugWinner, WIN_STEPS } from './tug-rules'
import { newSeed } from '../shell/challenge'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { Button, PLAYERS, SplitStage } from '../ui'

const game = getGame('tug-of-taps')
const KEYS = ['a', 'l']
type Phase = 'ready' | 'count' | 'pull' | 'done'

export default function TugOfTaps() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [count, setCount] = useState(3)
  const [pos, setPos] = useState(0)
  const [taps, setTaps] = useState([0, 0])
  const [seed] = useState(newSeed)
  const goAt = useRef(0)
  const [ms, setMs] = useState(0)
  const posRef = useRef(0)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function start() {
    document.querySelector('.qg-split')?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    posRef.current = 0
    setPos(0)
    setTaps([0, 0])
    setCount(3)
    setPhase('count')
    ;[2, 1].forEach((n, i) => timers.current.push(setTimeout(() => { setCount(n); feel.tap() }, (i + 1) * 700)))
    timers.current.push(setTimeout(() => { goAt.current = performance.now(); setPhase('pull'); feel.good() }, 2100))
  }

  function press(player: number) {
    if (phaseRef.current !== 'pull') return // taps before Go don't count
    posRef.current = pull(posRef.current, player)
    setPos(posRef.current)
    setTaps((t) => t.map((x, i) => (i === player ? x + 1 : x)))
    const w = tugWinner(posRef.current)
    if (w != null) {
      phaseRef.current = 'done'
      setMs(performance.now() - goAt.current)
      setPhase('done')
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0 && !e.repeat) press(i)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const winner = tugWinner(pos)
  const secs = ms / 1000
  const rate = (i: number) => (secs > 0 ? taps[i] / secs : 0)
  // Rope marker from each player's own view: 0 = far side, 100 = their own side.
  const towardMe = (i: number) => 50 + (i === 0 ? -pos : pos) * (50 / WIN_STEPS)

  const half = (i: number) => ({
    label: `${PLAYERS[i].name}'s side`,
    content: (
      <>
        <span className="score-xl">
          {phase === 'ready' ? PLAYERS[i].name : phase === 'count' ? count : phase === 'pull' ? 'PULL!' : winner === i ? 'You win' : 'Pulled over'}
        </span>
        <div className="tug-rope" aria-hidden="true">
          <span className="tug-marker" style={{ left: `${towardMe(i)}%` }} />
          <span className="tug-line tug-line--me" />
        </div>
        <span className="small">{phase === 'ready' ? 'Tap as fast as you can after Go' : `${taps[i]} taps`}</span>
        <kbd className="qg-kbd" aria-hidden="true">{KEYS[i].toUpperCase()}</kbd>
      </>
    ),
  })

  return (
    <>
      <SplitStage halves={[half(0), half(1)]} onPress={press} />
      {phase === 'ready' && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button size="lg" block color={game.color} onClick={start} data-primary="click" hint="Space">Start the tug</Button>
        </div>
      )}
      {phase === 'done' && winner != null && (
        <ResultCard
          game={game}
          headline={`${PLAYERS[winner].name} wins in ${secs.toFixed(1)} s`}
          detail={`${PLAYERS[0].name} ${rate(0).toFixed(1)} taps a second · ${PLAYERS[1].name} ${rate(1).toFixed(1)}`}
          shareText={`🪢 Tug of Taps\n${PLAYERS[winner].name} won in ${secs.toFixed(1)} s\n${Math.max(rate(0), rate(1)).toFixed(1)} taps a second`}
          finishData={{ secs: Math.round(secs * 10) / 10 }}
          challenge={{ seed, score: Math.round(ms), text: `${secs.toFixed(1)} s`, lowerIsBetter: true }}
          onReplay={start}
          replayLabel="Rematch"
        />
      )}
    </>
  )
}
