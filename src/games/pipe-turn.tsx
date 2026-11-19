import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { boardFor, EAST, flow, N, NORTH, solved, SOUTH, turn, WEST } from './pipe-turn/pipes'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Score, Stage } from '../ui'

const game = getGame('pipe-turn')

/** One pipe piece drawn upright from its openings; the cell rotates it. */
function Piece({ mask }: { mask: number }) {
  const ends: [number, number, number][] = [[NORTH, 50, 0], [EAST, 100, 50], [SOUTH, 50, 100], [WEST, 0, 50]]
  const arms = ends.filter(([d]) => mask & d).map(([d, x, y]) => <line key={d} x1="50" y1="50" x2={x} y2={y} />)
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g className="pt-pipe-edge">{arms}<circle cx="50" cy="50" r="15" /></g>
      <g className="pt-pipe">{arms}<circle cx="50" cy="50" r="11" /></g>
    </svg>
  )
}

export default function PipeTurn() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const board = useMemo(() => boardFor(seed), [seed])
  const [tries, setTries] = useState<number[]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[])))
  const [turns, setTurns] = useState<number[]>(() => new Array(N * N).fill(0))
  const [moves, setMoves] = useState(0)
  const [phase, setPhase] = useState<'play' | 'won' | 'done'>(tries.length ? 'done' : 'play')
  const [fresh, setFresh] = useState(false)
  const [focus, setFocus] = useState(board.source)
  const cells = useRef<(HTMLButtonElement | null)[]>([])
  const pieces = board.pieces.map((m, i) => turn(m, turns[i]))
  const wet = flow(pieces, board.source)
  const won = solved(pieces, board.source, board.sink)

  useEffect(() => {
    if (!won || phase !== 'play') return
    setPhase('won')
    feel.chime(4)
    feel.success()
    const all = [...tries, moves]
    setTries(all)
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = Math.min(...all)
      recordDaily(game.slug, -best, new Date(), `${best} turns`)
    }
    setFresh(true)
    const t = setTimeout(() => setPhase('done'), 1600)
    return () => clearTimeout(t)
  }, [won]) // eslint-disable-line react-hooks/exhaustive-deps

  function spin(i: number) {
    if (phase !== 'play') return
    feel.click()
    feel.light()
    setTurns((t) => t.map((k, j) => (j === i ? k + 1 : k)))
    setMoves((m) => m + 1)
    setFocus(i)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play') return
      const d: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -N, ArrowDown: N }
      if (!(e.key in d)) return
      e.preventDefault()
      const r = Math.floor(focus / N), c = focus % N
      const next = e.key === 'ArrowLeft' ? (c > 0 ? focus - 1 : focus) : e.key === 'ArrowRight' ? (c < N - 1 ? focus + 1 : focus) : e.key === 'ArrowUp' ? (r > 0 ? focus - N : focus) : r < N - 1 ? focus + N : focus
      setFocus(next)
      if (document.activeElement?.closest('.pt-grid')) cells.current[next]?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function again() {
    setTurns(new Array(N * N).fill(0))
    setMoves(0)
    setPhase('play')
  }

  if (phase === 'done' && tries.length) {
    const best = Math.min(...tries)
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const vs = best === board.par ? 'on par' : best < board.par ? `${board.par - best} under par` : `${best - board.par} over par`
    const stats = getStats(game.slug)
    return (
      <ResultCard
        game={game}
        headline={`${best} turns`}
        detail={<>Par {board.par}, {vs} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
        shareText={`🚰 Pipe Turn ${puzzleLabel(day)}\nWatered the plant in ${best} turns (par ${board.par})\nBest of ${n}`}
        finishData={{ score: best, tries: tries.length }}
        trackFinish={fresh}
        challenge={{ seed, score: best, text: `${best} turns`, lowerIsBetter: true }}
        onReplay={again}
        replayLabel="Try again"
      />
    )
  }

  const sourceRow = Math.floor(board.source / N), sinkRow = Math.floor(board.sink / N)
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <Score label="Turns" value={String(moves)} size="md" />
        <Score label="Par" value={String(board.par)} size="md" />
      </div>
      <Stage className="pt-stage" style={{ position: 'relative' }}>
        <div className="pt-board">
          <span className="pt-end pt-tap" style={{ gridRow: sourceRow + 1 }} aria-label="Tap" role="img">🚰</span>
          <div className="pt-grid" role="grid" data-board={JSON.stringify({ pieces: board.pieces, source: board.source, sink: board.sink })} aria-label="Pipes. Turn them to connect the tap on the left to the plant on the right.">
            {pieces.map((_, i) => (
              <button
                key={i}
                ref={(el) => { cells.current[i] = el }}
                type="button"
                className={`pt-cell${wet.has(i) ? ' is-wet' : ''}`}
                aria-label={`Row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}${wet.has(i) ? ', water flowing' : ''}`}
                tabIndex={i === focus ? 0 : -1}
                data-primary={i === focus ? 'click' : undefined}
                data-cursor={i === focus || undefined}
                onClick={() => spin(i)}
              >
                <span className="pt-rot" style={{ rotate: `${turns[i] * 90}deg` }}><Piece mask={board.pieces[i]} /></span>
              </button>
            ))}
          </div>
          <span className={`pt-end pt-plant${won ? ' is-bloom' : ''}`} style={{ gridRow: sinkRow + 1 }} aria-label={won ? 'The plant, watered' : 'A thirsty plant'} role="img">{won ? '🌸' : '🌱'}</span>
        </div>
        {phase === 'won' && <Burst x="92%" y={`${((sinkRow + 0.5) / N) * 100}%`} color={game.color} />}
      </Stage>
      <div className="row" style={{ marginTop: 'var(--space-3)' }}>
        <Button variant="secondary" onClick={again} disabled={!moves || phase !== 'play'}>Start over</Button>
      </div>
      <p className="small muted center" style={{ margin: 'var(--space-2) 0 0' }}>Tap a pipe to turn it. On a computer: arrows and Space.</p>
    </>
  )
}
