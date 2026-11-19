import { useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { clampToBoard, crossings, graphFor, SIZE, type P } from './untangle-lights/graph'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { load } from '../shell/storage'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Stage } from '../ui'

const game = getGame('untangle-lights')
type Run = { pos: P[]; moves: number }

export default function UntangleLights() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const g = useMemo(() => graphFor(seed), [seed])
  const [tries, setTries] = useState<number[]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[])))
  // Where the lights are survives a refresh.
  const [run, setRun] = useRunState<Run>(`${game.slug}:${seed}:${oneOff ? 'once' : tries.length}`, () => ({ pos: g.start, moves: 0 }))
  const [done, setDone] = useState(tries.length > 0 && run.moves === 0)
  const [fresh, setFresh] = useState(false)
  const [solvedNow, setSolvedNow] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ i: number; from: P; moved: boolean } | null>(null)
  const kbMoved = useRef<number | null>(null)
  const crossed = crossings(g.edges, run.pos)
  const bad = new Set(crossed.flat())
  const tangled = crossed.length
  const showSolution = useMemo(() => load<boolean>('test-solutions', false), [])

  function finishIfClear(pos: P[], moves: number) {
    if (crossings(g.edges, pos).length || solvedNow) return
    setSolvedNow(true)
    g.edges.forEach((_, i) => setTimeout(() => feel.pop(Math.min(i, 12)), 40 * i))
    feel.success()
    // Saved now, so a refresh during the glow can't lose it.
    const all = [...tries, moves]
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = Math.min(...all)
      recordDaily(game.slug, best, new Date(), count(best, 'move'), true)
    }
    setFresh(true)
  }

  function toBoard(e: { clientX: number; clientY: number }): P {
    const r = svg.current!.getBoundingClientRect()
    return clampToBoard({ x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE })
  }
  function onDown(i: number, e: React.PointerEvent) {
    if (solvedNow) return
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    drag.current = { i, from: run.pos[i], moved: false }
    feel.light()
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const p = toBoard(e)
    if (Math.hypot(p.x - d.from.x, p.y - d.from.y) > 3) d.moved = true
    setRun({ ...run, pos: run.pos.map((q, k) => (k === d.i ? p : q)) })
  }
  function onUp() {
    const d = drag.current
    drag.current = null
    if (!d || !d.moved) return
    const moves = run.moves + 1
    setRun({ ...run, moves })
    feel.tap()
    finishIfClear(run.pos, moves)
  }

  // Keyboard: Tab to a light, arrows move it (Shift for small steps); leaving it counts one move.
  function onKey(i: number, e: React.KeyboardEvent) {
    const step = e.shiftKey ? 2 : 8
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (e.key in d && !solvedNow) {
      e.preventDefault()
      kbMoved.current = i
      setRun({ ...run, pos: run.pos.map((q, k) => (k === i ? clampToBoard({ x: q.x + d[e.key][0], y: q.y + d[e.key][1] }) : q)) })
    } else if (e.key === 'Enter') endKeyMove()
  }
  function endKeyMove() {
    if (kbMoved.current == null) return
    kbMoved.current = null
    const moves = run.moves + 1
    setRun({ ...run, moves })
    finishIfClear(run.pos, moves)
  }

  function seeResult() {
    setTries([...tries, run.moves])
    setDone(true)
  }
  function again() {
    setRun({ pos: g.start, moves: 0 })
    setSolvedNow(false)
    setDone(false)
  }

  if (done && tries.length) {
    const best = Math.min(...tries)
    const n = count(tries.length, 'try', 'tries')
    const stats = getStats(game.slug)
    return (
      <ResultCard
        game={game}
        headline={`Untangled in ${count(best, 'move')}`}
        detail={<>{g.n} lights · par {g.par}{best < g.par ? ' · under par' : best === g.par ? ' · on par' : ''} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
        shareText={`💡 Untangle Lights ${puzzleLabel(day)}\nUntangled ${g.n} lights in ${count(best, 'move')} (par ${g.par})\nBest of ${n}`}
        finishData={{ moves: best, tries: tries.length }}
        trackFinish={fresh}
        challenge={{ seed, score: best, text: count(best, 'move'), lowerIsBetter: true }}
        onReplay={again}
        replayLabel="Try again"
      />
    )
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">{g.n} lights · par {g.par}{tries.length ? ` · try ${tries.length + 1}` : ''}</span>
        <span className="small muted" aria-live="polite">{count(run.moves, 'move')} · {solvedNow ? 'all clear' : `${count(tangled, 'crossing')}`}</span>
      </div>
      <Stage flush className="ul-stage" style={{ position: 'relative' }}>
        <svg
          ref={svg}
          className={`ul-svg${solvedNow ? ' is-solved' : ''}`}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          data-crossings={tangled}
          data-solution={showSolution ? JSON.stringify(g.solved.map((p) => [Math.round(p.x), Math.round(p.y)])) : undefined}
          data-start={JSON.stringify(run.pos.map((p) => [Math.round(p.x), Math.round(p.y)]))}
        >
          {g.edges.map(([a, b], i) => (
            <line key={i} className={bad.has(i) ? 'ul-wire is-crossed' : 'ul-wire'} x1={run.pos[a].x} y1={run.pos[a].y} x2={run.pos[b].x} y2={run.pos[b].y} style={{ animationDelay: `${i * 40}ms` }} />
          ))}
          {run.pos.map((p, i) => (
            <g key={i} className="ul-light" transform={`translate(${p.x} ${p.y})`} style={{ animationDelay: `${i * 60}ms` }}>
              <circle className="ul-hit" r={22} onPointerDown={(e) => onDown(i, e)}
                role="button" tabIndex={0} aria-label={`Light ${i + 1}`}
                onKeyDown={(e) => onKey(i, e)} onBlur={endKeyMove} />
              <circle className="ul-bulb" r={11} />
            </g>
          ))}
        </svg>
        {solvedNow && <Burst y="50%" color={game.color} />}
      </Stage>
      <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {solvedNow ? (
          <Button size="lg" block color={game.color} onClick={seeResult} data-primary="click" hint="Space">See my result ({count(run.moves, 'move')})</Button>
        ) : (
          <p className="small muted center" style={{ margin: 0 }}>Drag the lights until no wires cross. Red wires are crossing. Each time you drag a light counts as one move; par is one move per light.</p>
        )}
      </div>
    </>
  )
}
