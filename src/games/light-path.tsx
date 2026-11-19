import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { boardFor, MAX_MIRRORS, N, targets, trace, type Cell } from './light-path/beam'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { count } from '../shell/plural'
import { Burst, Button, Score, Stage } from '../ui'

const game = getGame('light-path')
type Try = { mirrors: number; moves: number }
const better = (a: Try, b: Try) => a.mirrors < b.mirrors || (a.mirrors === b.mirrors && a.moves < b.moves)

export default function LightPath() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const board = useMemo(() => boardFor(seed), [seed])
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday(game.slug, [] as Try[])))
  const [placed, setPlaced] = useState<Record<number, '/' | '\\'>>({})
  const [moves, setMoves] = useState(0)
  const [phase, setPhase] = useState<'play' | 'won' | 'done'>(tries.length ? 'done' : 'play')
  const [fresh, setFresh] = useState(false)
  const [focus, setFocus] = useState(board.laser + 1)
  const [full, setFull] = useState(false)
  const cellsRef = useRef<(HTMLButtonElement | null)[]>([])
  const cells: Cell[] = board.cells.map((c, i) => placed[i] ?? c)
  const beam = trace(cells, board.laser)
  const goal = targets(board.cells)
  const allLit = goal.every((i) => beam.lit.has(i))
  const mirrors = Object.keys(placed).length

  useEffect(() => {
    if (!allLit || phase !== 'play') return
    setPhase('won')
    feel.chime(4)
    feel.success()
    const all = [...tries, { mirrors, moves }]
    setTries(all)
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = all.reduce((a, b) => (better(b, a) ? b : a))
      recordDaily(game.slug, -(best.mirrors * 1000 + best.moves), new Date(), `${count(best.mirrors, 'mirror')}`)
    }
    setFresh(true)
    const t = setTimeout(() => setPhase('done'), 1700)
    return () => clearTimeout(t)
  }, [allLit]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Tap a free cell: place '/', then '\\', then remove. */
  function cycle(i: number) {
    if (phase !== 'play' || board.cells[i] !== '') return
    const cur = placed[i]
    if (!cur && mirrors >= MAX_MIRRORS) { feel.bad(); setFull(true); setTimeout(() => setFull(false), 900); return }
    const next = { ...placed }
    if (!cur) next[i] = '/'
    else if (cur === '/') next[i] = '\\'
    else delete next[i]
    feel.click()
    feel.light()
    setPlaced(next)
    setMoves((m) => m + 1)
    setFocus(i)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play') return
      const d: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }
      if (!(e.key in d)) return
      e.preventDefault()
      const r = Math.min(N - 1, Math.max(0, Math.floor(focus / N) + d[e.key][0])), c = Math.min(N - 1, Math.max(0, (focus % N) + d[e.key][1]))
      setFocus(r * N + c)
      if (document.activeElement?.closest('.lp-grid')) cellsRef.current[r * N + c]?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function again() {
    setPlaced({})
    setMoves(0)
    setPhase('play')
  }

  if (phase === 'done' && tries.length) {
    const best = tries.reduce((a, b) => (better(b, a) ? b : a))
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <ResultCard
        game={game}
        headline={`${count(best.mirrors, 'mirror')}, ${count(best.moves, 'move')}`}
        detail={<>Par {board.par} mirrors{best.mirrors === board.par ? ' · on par' : ''} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
        shareText={`🔦 Light Path ${puzzleLabel(day)}\nLit every target with ${count(best.mirrors, 'mirror')} (par ${board.par}) in ${count(best.moves, 'move')}\nBest of ${n}`}
        finishData={{ mirrors: best.mirrors, moves: best.moves, tries: tries.length }}
        trackFinish={fresh}
        challenge={{ seed, score: best.mirrors * 1000 + best.moves, text: `${count(best.mirrors, 'mirror')}, ${count(best.moves, 'move')}`, lowerIsBetter: true }}
        onReplay={again}
        replayLabel="Try again"
      />
    )
  }

  // The beam as a line through cell centres, in a 0..N viewBox.
  const pts = beam.path.map((i) => `${(i % N) + 0.5},${Math.floor(i / N) + 0.5}`)
  const last = beam.path[beam.path.length - 1]
  if (beam.end === 'edge') {
    // Carry the line out to the board edge in the final direction.
    const prev = beam.path[beam.path.length - 2] ?? last
    const dx = (last % N) - (prev % N), dy = Math.floor(last / N) - Math.floor(prev / N)
    pts.push(`${(last % N) + 0.5 + dx * 0.5},${Math.floor(last / N) + 0.5 + dy * 0.5}`)
  }
  const line = pts.join(' ')
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <Score label="Mirrors" value={`${mirrors} / ${MAX_MIRRORS}`} size="md" />
        <Score label="Targets lit" value={`${goal.filter((i) => beam.lit.has(i)).length} / ${goal.length}`} size="md" />
      </div>
      <Stage className="lp-stage" style={{ position: 'relative' }}>
        <div className="lp-wrap">
          <div className="lp-grid" role="grid" aria-label="Place up to three mirrors so the laser lights every target." data-board={JSON.stringify({ cells: board.cells, laser: board.laser })}>
            {cells.map((c, i) => (
              <button
                key={i}
                ref={(el) => { cellsRef.current[i] = el }}
                type="button"
                className={`lp-cell lp-${c === '/' ? 'm1' : c === '\\' ? 'm2' : c || 'empty'}${beam.lit.has(i) ? ' is-lit' : ''}`}
                aria-label={`Row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}: ${c === '' ? 'empty' : c === '/' || c === '\\' ? 'mirror' : c}${beam.lit.has(i) ? ', lit' : ''}`}
                tabIndex={i === focus ? 0 : -1}
                data-primary={i === focus ? 'click' : undefined}
                data-cursor={i === focus || undefined}
                onClick={() => cycle(i)}
              >
                {c === 'laser' && <span aria-hidden="true">▶</span>}
                {c === 'target' && <span className="lp-target" aria-hidden="true" />}
                {(c === '/' || c === '\\') && <span className="lp-mirror" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <svg className="lp-beam" viewBox={`0 0 ${N} ${N}`} aria-hidden="true" preserveAspectRatio="none">
            <polyline key={'o' + line} points={line} className="lp-beam-edge" />
            <polyline key={line} points={line} />
          </svg>
        </div>
        {phase === 'won' && <Burst color={game.color} />}
      </Stage>
      <div className="row" style={{ marginTop: 'var(--space-3)' }}>
        <span className="small muted">Moves: {moves}</span>
        <Button variant="secondary" onClick={again} disabled={!moves || phase !== 'play'}>Clear mirrors</Button>
      </div>
      <p className="small center" style={{ margin: 'var(--space-2) 0 0', color: full ? 'var(--danger)' : undefined }} aria-live="polite">
        {full ? 'Only three mirrors. Tap one twice more to remove it.' : <span className="muted">Tap a square to place a mirror, again to flip it, again to remove it.</span>}
      </p>
    </>
  )
}
