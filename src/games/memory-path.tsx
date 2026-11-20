import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { ResultCard } from '../shell/ResultCard'
import { newSeed, readChallenge } from '../shell/challenge'
import { seededRandom } from '../shell/daily'
import { feel, tone } from '../shell/feel'
import { getStats, recordPlay } from '../shell/stats'
import { Button, Score, Stage, GetReady } from '../ui/components'

const game = getGame('memory-path')
const N = 4
// A note per square (pentatonic, so any path sounds fine), heard only with sound on.
const NOTES = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093]
const note = (cell: number) => tone(NOTES.at(cell) ?? 440, 220, { type: 'triangle', volume: 0.08 })

/** How long each square stays lit: 480 ms, getting quicker after 8 steps. */
const onMs = (len: number) => Math.max(260, 480 - Math.max(0, len - 8) * 25)
const GAP_MS = 140

function extend(path: number[], rng: () => number): number[] {
  const last = path[path.length - 1]
  let next = last
  while (next === last) next = Math.floor(rng() * N * N)
  return [...path, next]
}

type Phase = 'countdown' | 'ready' | 'showing' | 'input' | 'done'

export default function MemoryPath() {
  // A challenge link plays its path first; every other game gets a new seed.
  const challenge = readChallenge(game.slug)
  const [seed, setSeed] = useState(() => challenge?.s ?? newSeed())
  const rng = useRef(seededRandom(seed))
  const [path, setPath] = useState<number[]>(() => extend(extend([], rng.current), rng.current))
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
    const on = onMs(p.length)
    p.forEach((cell, i) => {
      timers.current.push(setTimeout(() => { setLit(cell); note(cell) }, 400 + i * (on + GAP_MS)))
      timers.current.push(setTimeout(() => setLit(null), 400 + i * (on + GAP_MS) + on))
    })
    timers.current.push(setTimeout(() => setPhase('input'), 400 + p.length * (on + GAP_MS)))
  }

  function tap(cell: number) {
    if (phase !== 'input') return
    if (cell !== path[pos]) {
      feel.bad()
      setWrong(cell)
      setPhase('done')
      recordPlay(game.slug, score, undefined, score > 0 ? String(score) : undefined)
      return
    }
    note(cell)
    setLit(cell)
    timers.current.push(setTimeout(() => setLit((l) => (l === cell ? null : l)), 180))
    if (pos + 1 === path.length) {
      setScore(path.length)
      const next = extend(path, rng.current)
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
    // Replays always get a new puzzle: replaying a challenge you have now seen would make a memorised run a best.
    const nextSeed = newSeed()
    setSeed(nextSeed)
    rng.current = seededRandom(nextSeed)
    const p = extend(extend([], rng.current), rng.current)
    setPath(p)
    setPhase('ready')
  }

  const best = getStats(game.slug).best
  const status =
    phase === 'ready' ? 'Press Start, then watch the squares'
    : phase === 'countdown' ? 'Get ready…'
    : phase === 'showing' ? `Watch: ${path.length} steps`
    : phase === 'input' ? `Your turn: ${pos} of ${path.length}`
    : `✕ Wrong square. The green outline was next.`

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">{status}</span>
        <Score label="Steps" value={score} size="md" bump />
      </div>
      <Stage flush>
        <div className="grid mp-grid" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
          {phase === 'countdown' && <GetReady onDone={() => play(path)} />}
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
          <Button size="lg" block color={game.color} onClick={() => setPhase('countdown')} data-primary="click" hint="Space">Start</Button>
        </div>
      )}
      {phase === 'done' && (
        <ResultCard
          game={game}
          headline={score ? `${score}-step path` : 'No path this time'}
          detail={best != null && best > score ? `Your best: ${best} steps` : undefined}
          shareText={score > 0 ? `🧠 Memory Path\nRepeated a ${score}-step path\n${'🟦'.repeat(Math.min(score, 20))}` : '🧠 Memory Path\nMissed the very first path'}
          finishData={{ steps: score }}
          challenge={{ seed, score, text: `${score} steps`, lowerIsBetter: false }}
          onReplay={reset}
        />
      )}
    </>
  )
}
