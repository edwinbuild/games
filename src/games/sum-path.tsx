import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { adjacent, puzzleFor, shortest, sumOf } from './sum-path/grid'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { HintButton, hintUsed } from '../shell/Hint'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { load } from '../shell/storage'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Stage } from '../ui/components'
import './sum-path.css'

const game = getGame('sum-path')

export default function SumPath() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const p = useMemo(() => puzzleFor(seed), [seed])
  const { w, h, cells, target } = p
  const end = w * h - 1
  const [tries, setTries] = useState<number[]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[])))
  const [path, setPath] = useRunState<number[]>(`${game.slug}:${seed}:${oneOff ? 'once' : tries.length}`, [0])
  const [done, setDone] = useState(tries.length > 0 && path.length <= 1)
  const [fresh, setFresh] = useState(false)
  const grid = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const head = path[path.length - 1]
  const inPath = new Set(path)
  const sum = sumOf(cells, path)
  const atEnd = head === end
  const right = atEnd && sum === target
  const showSolution = useMemo(() => load<boolean>('test-solutions', false), [])

  function update(next: number[]) {
    setPath(next)
    if (next[next.length - 1] === end && sumOf(cells, next) === target) {
      const n = next.length
      const all = [...tries, n]
      if (!oneOff) {
        saveToday(game.slug, all)
        const best = Math.min(...all)
        recordDaily(game.slug, best, new Date(), count(best, 'square'), true)
      }
      setFresh(true)
      next.forEach((_, i) => setTimeout(() => feel.pop(Math.min(i, 12)), 30 * i))
      feel.success()
    } else if (next[next.length - 1] === end) feel.bad()
  }

  /** Step onto a square: extend from the head, or step back onto the square before it. */
  function stepTo(c: number) {
    if (right) return
    if (path.length >= 2 && c === path[path.length - 2]) { setPath(path.slice(0, -1)); feel.tap(); return }
    if (inPath.has(c) || atEnd || !adjacent(w, h, head).includes(c)) return
    update([...path, c])
    feel.light()
  }
  const cellAt = (e: { clientX: number; clientY: number }): number | null => {
    const r = grid.current!.getBoundingClientRect()
    const x = Math.floor(((e.clientX - r.left) / r.width) * w), y = Math.floor(((e.clientY - r.top) / r.height) * h)
    return x >= 0 && x < w && y >= 0 && y < h ? y * w + x : null
  }
  function onDown(e: React.PointerEvent) {
    const c = cellAt(e)
    if (c == null || right) return
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    // Tapping a square on the path cuts it back to there; drawing carries on from the head.
    if (inPath.has(c) && c !== head) { setPath(path.slice(0, path.indexOf(c) + 1)); feel.tap() }
    else if (c !== head) stepTo(c)
    drawing.current = true
  }
  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return
    const c = cellAt(e)
    if (c != null && c !== head) stepTo(c)
  }
  // Keyboard: arrows step the path (back over the last square to undo it).
  useEffect(() => {
    if (done || right) return
    const onKey = (e: KeyboardEvent) => {
      const x = head % w, y = Math.floor(head / w)
      const to: Record<string, [number, number]> = { ArrowLeft: [x - 1, y], ArrowRight: [x + 1, y], ArrowUp: [x, y - 1], ArrowDown: [x, y + 1] }
      if (!(e.key in to) || (e.target as HTMLElement | null)?.closest('input, textarea')) return
      e.preventDefault()
      const [nx, ny] = to[e.key]
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) stepTo(ny * w + nx)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /** A hint: one more square of a shortest right path (cutting back first if the path can't get there). */
  function hint() {
    for (let k = path.length - (atEnd ? 1 : 0); k >= 1; k--) {
      const way = shortest(p, target, Math.min(w * h, p.par + 8), path.slice(0, k))
      if (!way) continue
      update(way.slice(0, k + 1))
      feel.light()
      return
    }
    return false
  }
  function seeResult() {
    setTries([...tries, path.length])
    setDone(true)
  }
  function again() {
    setPath([0])
    setDone(false)
  }

  if (done && tries.length) {
    const best = Math.min(...tries)
    const n = count(tries.length, 'try', 'tries')
    const stats = getStats(game.slug)
    return (
      <ResultCard
        game={game}
        headline={`${target} in ${count(best, 'square')}`}
        detail={<>{w}×{h} grid · par {p.par}{best === p.par ? ' · on par' : ''} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
        shareText={`➕ Sum Path ${puzzleLabel(day)}\nMade ${target} in ${count(best, 'square')} (par ${p.par})\n${Array.from({ length: best }, (_, i) => (i < p.par ? '🟧' : '⬜')).join('')}`}
        finishData={{ squares: best, par: p.par, tries: tries.length }}
        trackFinish={fresh}
        challenge={{ seed, score: best, text: count(best, 'square'), lowerIsBetter: true }}
        hinted={!oneOff && hintUsed(game.slug)}
        onReplay={again}
        replayLabel="Try again"
      />
    )
  }

  const pt = (c: number) => `${(((c % w) + 0.5) / w) * 100},${((Math.floor(c / w) + 0.5) / h) * 100}`
  const over = sum > target
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">Par {p.par} squares{tries.length ? ` · try ${tries.length + 1}` : ''}</span>
        <span className="small muted">{count(path.length, 'square')}</span>
      </div>
      <div className={`sp-total${over ? ' is-over' : ''}${right ? ' is-right' : ''}`} aria-live="polite">
        <span className="sp-sum">{sum}</span>
        <span className="sp-of">of {target}</span>
      </div>
      <Stage flush className="sp-stage" style={{ position: 'relative' }}>
        <div
          ref={grid}
          className={`sp-grid${right ? ' is-solved' : ''}`}
          style={{ gridTemplateColumns: `repeat(${w}, 1fr)`, aspectRatio: `${w} / ${h}` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => { drawing.current = false }}
          onPointerCancel={() => { drawing.current = false }}
          role="application"
          aria-label={`A ${w} by ${h} grid of digits. Draw a path from the top left to the bottom right that adds up to ${target}. Use the arrow keys to step.`}
          data-solution={showSolution ? JSON.stringify(p.solution) : undefined}
          data-path={JSON.stringify(path)}
        >
          <svg className="sp-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={path.map(pt).join(' ')} />
          </svg>
          {cells.map((v, c) => (
            <span key={c} className={`sp-cell${inPath.has(c) ? ' is-on' : ''}${c === head ? ' is-head' : ''}${c === 0 ? ' is-start' : ''}${c === end ? ' is-end' : ''}`}>
              {v}
            </span>
          ))}
        </div>
        {right && <Burst y="45%" color={game.color} />}
      </Stage>
      <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {right ? (
          <Button size="lg" block color={game.color} onClick={seeResult} data-primary="click" hint="Space">See my result ({count(path.length, 'square')})</Button>
        ) : (
          <>
            {atEnd && <p className="small center sp-msg" role="status">That adds up to {sum}, not {target}. Tap a square on the path to go back to it.</p>}
            {!atEnd && over && <p className="small center sp-msg" role="status">Already over {target}: go back a little.</p>}
            <div className="row">
              <Button variant="secondary" onClick={() => { setPath([0]); feel.tap() }} disabled={path.length <= 1}>Start over</Button>
              <HintButton game={game.slug} oneOff={oneOff} onHint={hint} />
            </div>
            <p className="small muted center" style={{ margin: 0 }}>Drag from the top-left square to the bottom-right one. The squares you pass through add up; make exactly {target} with as few squares as you can. Drag back to undo; tap a square on the path to cut it back.</p>
          </>
        )}
      </div>
    </>
  )
}
