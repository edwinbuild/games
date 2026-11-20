import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { adjacent, check, puzzleFor, xy, type Cell } from './garden-path/path'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { HintButton, hintUsed } from '../shell/Hint'
import { useRunState } from '../shell/session'
import { load } from '../shell/storage'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Stage } from '../ui/components'
import './garden-path.css'

const game = getGame('garden-path')
/** The path so far, and seconds spent before this visit (the clock keeps running across a refresh). */
type Run = { path: Cell[]; secs: number }
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function GardenPath() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const p = useMemo(() => puzzleFor(seed), [seed])
  const { w, h, start, end, stones } = p
  const [tries, setTries] = useState<number[]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[])))
  const [run, setRun] = useRunState<Run>(`${game.slug}:${seed}:${oneOff ? 'once' : tries.length}`, () => ({ path: [start], secs: 0 }))
  const [done, setDone] = useState(tries.length > 0 && run.path.length <= 1)
  const [fresh, setFresh] = useState(false)
  const [solved, setSolved] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const since = useRef<number | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const path = run.path
  const head = path[path.length - 1]
  const inPath = new Set(path)
  const full = path.length === w * h && head === end
  const result = full ? check(p, path) : null
  const broken = new Set(result?.broken ?? [])
  const elapsed = run.secs + (since.current != null && solved == null ? now - since.current : 0)
  const showSolution = useMemo(() => load<boolean>('test-solutions', false), [])

  // The clock runs from the first step until the path is right.
  useEffect(() => {
    if (solved != null || path.length <= 1 || done) return
    if (since.current == null) since.current = performance.now() / 1000
    const id = setInterval(() => setNow(performance.now() / 1000), 250)
    setNow(performance.now() / 1000)
    return () => clearInterval(id)
  }, [path.length > 1, solved, done]) // eslint-disable-line react-hooks/exhaustive-deps

  function setPath(next: Cell[]) {
    const secs = since.current != null ? run.secs + performance.now() / 1000 - since.current : run.secs
    if (since.current != null) since.current = performance.now() / 1000
    setRun({ path: next, secs })
    if (next.length === w * h && next[next.length - 1] === end) {
      if (check(p, next).ok) {
        const t = Math.max(1, Math.round(secs))
        setSolved(t)
        next.forEach((_, i) => i % 3 === 0 && setTimeout(() => feel.pop(Math.min(i / 3, 12)), 25 * i))
        feel.success()
        // Saved now, so a refresh during the bloom can't lose it.
        const all = [...tries, t]
        if (!oneOff) {
          saveToday(game.slug, all)
          const best = Math.min(...all)
          recordDaily(game.slug, best, new Date(), clock(best), true)
        }
        setFresh(true)
      } else feel.bad()
    }
  }

  /** Step onto a square: extend the path if it's next to the head, step back if it's the square before. */
  function stepTo(c: Cell) {
    if (solved != null) return
    if (path.length >= 2 && c === path[path.length - 2]) { setPath(path.slice(0, -1)); feel.tap(); return }
    if (inPath.has(c) || !adjacent(w, h, head).includes(c) || head === end) return
    setPath([...path, c])
    feel.light()
  }
  const cellAt = (e: { clientX: number; clientY: number }): Cell | null => {
    const r = grid.current!.getBoundingClientRect()
    const x = Math.floor(((e.clientX - r.left) / r.width) * w), y = Math.floor(((e.clientY - r.top) / r.height) * h)
    return x >= 0 && x < w && y >= 0 && y < h ? y * w + x : null
  }
  function onDown(e: React.PointerEvent) {
    const c = cellAt(e)
    if (c == null || solved != null) return
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    // Tapping a square on the path cuts it back to there; drawing carries on from the head.
    if (inPath.has(c) && c !== head) { setPath(path.slice(0, path.indexOf(c) + 1)); feel.tap() }
    drawing.current = true
  }
  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return
    const c = cellAt(e)
    if (c != null && c !== head) stepTo(c)
  }
  // Keyboard: arrows step the path (back over the last square to undo it).
  useEffect(() => {
    if (done || solved != null) return
    const onKey = (e: KeyboardEvent) => {
      const [x, y] = xy(w, head)
      const to: Record<string, [number, number]> = { ArrowLeft: [x - 1, y], ArrowRight: [x + 1, y], ArrowUp: [x, y - 1], ArrowDown: [x, y + 1] }
      if (!(e.key in to) || (e.target as HTMLElement | null)?.closest('input, textarea')) return
      e.preventDefault()
      const [nx, ny] = to[e.key]
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) stepTo(ny * w + nx)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /** A hint: cut the path back to where it last matched the solution, then take one right step. */
  function hint() {
    let k = 0
    while (k < path.length && path[k] === p.solution[k]) k++
    if (k >= p.solution.length) return false
    setPath(p.solution.slice(0, k + 1))
    feel.light()
  }

  function seeResult() {
    setTries([...tries, solved!])
    setDone(true)
  }
  function again() {
    since.current = null
    setRun({ path: [start], secs: 0 })
    setSolved(null)
    setDone(false)
  }

  if (done && tries.length) {
    const best = Math.min(...tries)
    const n = count(tries.length, 'try', 'tries')
    const stats = getStats(game.slug)
    return (
      <ResultCard
        game={game}
        headline={`Path found in ${clock(best)}`}
        detail={<>{w}×{h} garden · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
        shareText={`🌱 Garden Path ${puzzleLabel(day)}\nWalked the ${w}×${h} garden in ${clock(best)}\nBest of ${n}`}
        finishData={{ secs: best, tries: tries.length }}
        trackFinish={fresh}
        challenge={{ seed, score: best, text: clock(best), lowerIsBetter: true }}
        hinted={!oneOff && hintUsed(game.slug)}
        onReplay={again}
        replayLabel="Try again"
      />
    )
  }

  // The path as a line through square centres (percent of the grid).
  const pt = (c: Cell) => { const [x, y] = xy(w, c); return `${((x + 0.5) / w) * 100},${((y + 0.5) / h) * 100}` }
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">{w}×{h} garden{tries.length ? ` · try ${tries.length + 1}` : ''}</span>
        <span className="small muted" aria-live="off">{clock(solved ?? elapsed)} · {path.length} of {w * h} squares</span>
      </div>
      <Stage flush className="gp-stage" style={{ position: 'relative' }}>
        <div
          ref={grid}
          className={`gp-grid${solved != null ? ' is-solved' : ''}`}
          style={{ gridTemplateColumns: `repeat(${w}, 1fr)`, aspectRatio: `${w} / ${h}` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => { drawing.current = false }}
          onPointerCancel={() => { drawing.current = false }}
          role="application"
          aria-label={`A ${w} by ${h} garden. Draw one path from the seedling to the flower through every square. Use the arrow keys to step.`}
          data-solution={showSolution ? JSON.stringify(p.solution) : undefined}
          data-path={JSON.stringify(path)}
        >
          {Array.from({ length: w * h }, (_, c) => (
            <span key={c} className={`gp-cell${inPath.has(c) ? ' is-on' : ''}${broken.has(c) ? ' is-broken' : ''}`}>
              {c === start ? <span className="gp-mark" aria-label="start">🌱</span> : c === end ? <span className="gp-mark" aria-label="finish">🌼</span>
                : stones[c] ? <span className={`gp-stone gp-stone--${stones[c]}`} aria-label={stones[c] === 'turn' ? 'turns here' : 'goes straight here'} /> : null}
            </span>
          ))}
          <svg className="gp-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={path.map(pt).join(' ')} />
          </svg>
        </div>
        {solved != null && <Burst y="40%" color={game.color} />}
      </Stage>
      <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {solved != null ? (
          <Button size="lg" block color={game.color} onClick={seeResult} data-primary="click" hint="Space">See my result ({clock(solved)})</Button>
        ) : (
          <>
            {full && !result?.ok && <p className="small center gp-msg" role="status">Every square is covered, but {count(broken.size, 'stone')} {broken.size === 1 ? 'isn’t' : 'aren’t'} happy. Tap a square on the path to go back to it.</p>}
            <div className="row">
              <Button variant="secondary" onClick={() => { setPath([start]); feel.tap() }} disabled={path.length <= 1}>Start over</Button>
              <HintButton game={game.slug} oneOff={oneOff} onHint={hint} />
            </div>
            <p className="small muted center" style={{ margin: 0 }}>Drag from the seedling through every square to the flower. ● the path turns there; ○ it goes straight through. Drag back to undo; tap a square on the path to cut it back.</p>
          </>
        )}
      </div>
    </>
  )
}
