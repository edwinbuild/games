import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { ResultCard } from '../shell/ResultCard'
import { getStats, recordPlay } from '../shell/stats'
import { Button, Score, Stage } from '../ui'

const game = getGame('memory-path')
const N = 4
const ON_MS = 480
const GAP_MS = 140

function extend(path: number[]): number[] {
  const last = path[path.length - 1]
  let next = last
  while (next === last) next = Math.floor(Math.random() * N * N)
  return [...path, next]
}

type Phase = 'ready' | 'showing' | 'input' | 'done'

export default function MemoryPath() {
  const [path, setPath] = useState<number[]>(() => extend(extend([])))
  const [phase, setPhase] = useState<Phase>('ready')
  const [lit, setLit] = useState<number | null>(null)
  const [pos, setPos] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const [score, setScore] = useState(0) // longest path repeated correctly
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function play(p: number[]) {
    setPhase('showing')
    setPos(0)
    p.forEach((cell, i) => {
      timers.current.push(setTimeout(() => setLit(cell), 400 + i * (ON_MS + GAP_MS)))
      timers.current.push(setTimeout(() => setLit(null), 400 + i * (ON_MS + GAP_MS) + ON_MS))
    })
    timers.current.push(setTimeout(() => setPhase('input'), 400 + p.length * (ON_MS + GAP_MS)))
  }

  function tap(cell: number) {
    if (phase !== 'input') return
    if (cell !== path[pos]) {
      setWrong(cell)
      setPhase('done')
      recordPlay(game.slug, score)
      return
    }
    setLit(cell)
    timers.current.push(setTimeout(() => setLit((l) => (l === cell ? null : l)), 180))
    if (pos + 1 === path.length) {
      setScore(path.length)
      const next = extend(path)
      setPath(next)
      setPhase('showing')
      timers.current.push(setTimeout(() => play(next), 500))
    } else {
      setPos(pos + 1)
    }
  }

  function reset() {
    timers.current.forEach(clearTimeout)
    setWrong(null)
    setScore(0)
    setLit(null)
    const p = extend(extend([]))
    setPath(p)
    setPhase('ready')
  }

  const best = getStats(game.slug).best
  const status =
    phase === 'ready' ? 'Press Start and watch closely'
    : phase === 'showing' ? `Watch… (${path.length} steps)`
    : phase === 'input' ? `Your turn: ${pos} / ${path.length}`
    : `✕ The path was ${path.length} steps`

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">{status}</span>
        <Score label="Steps" value={score} size="md" />
      </div>
      <Stage flush>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
          {Array.from({ length: N * N }, (_, i) => {
            const state = wrong === i ? 'wrong' : lit === i ? 'lit' : phase === 'done' && path[pos] === i ? 'answer' : undefined
            return (
              <button
                key={i}
                className="qg-cell"
                data-state={state}
                aria-label={`Square ${i + 1}`}
                onPointerDown={() => tap(i)}
                onClick={(e) => e.detail === 0 && tap(i)}
                style={{ cursor: phase === 'input' ? 'pointer' : 'default' }}
              />
            )
          })}
        </div>
      </Stage>
      {phase === 'ready' && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button size="lg" block color={game.color} onClick={() => play(path)}>Start</Button>
        </div>
      )}
      {phase === 'done' && (
        <ResultCard
          game={game}
          headline={score ? `${score}-step path` : 'No path this time'}
          detail={best != null ? `Your best: ${best} step${best === 1 ? '' : 's'}` : undefined}
          shareText={`🧠 Memory Path\nRepeated a ${score}-step path\n${'🟦'.repeat(Math.min(score, 20))}`}
          finishData={{ steps: score }}
          onReplay={reset}
        />
      )}
    </>
  )
}
