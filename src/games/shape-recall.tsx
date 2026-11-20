import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { average, matchScore, shapesFor, SIZE } from './shape-recall/match'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { drawStroke, length, pointsFrom, type P } from '../shell/ink'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { AttemptTiles, Burst, Button, GetReady, Stage, type Attempt } from '../ui/components'

const game = getGame('shape-recall')
const ROUNDS = 3
const SHOW_MS = 2000
const grade = (s: number): Attempt => (s >= 85 ? 'hit' : s >= 65 ? 'near' : 'miss')
const square = (s: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(s)]
type Phase = 'ready' | 'countdown' | 'show' | 'draw' | 'compare' | 'done'
type Colors = { fill: string; edge: string; ink: string; muted: string }

export default function ShapeRecall() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const [tries, setTries] = useState<number[][]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[][])))
  const shapes = useMemo(() => shapesFor(seed, tries.length), [seed, tries.length])
  // The finished try is saved at the last stroke, but the next try's shapes only come in when you move on.
  const pending = useRef<number[][] | null>(null)
  // The try in progress survives a refresh (it picks up at the next shape).
  const [scores, setScores] = useRunState<number[]>(`${game.slug}:${seed}:${oneOff ? 'once' : tries.length}`, [])
  const [phase, setPhase] = useState<Phase>(scores.length ? 'ready' : tries.length ? 'done' : 'ready')
  const [fresh, setFresh] = useState(false)
  const [left, setLeft] = useState(SHOW_MS)
  const canvas = useRef<HTMLCanvasElement>(null)
  const colors = useRef<Colors | null>(null)
  const stroke = useRef<P[]>([])
  const drawing = useRef(false)
  const round = Math.min(scores.length - (phase === 'compare' ? 1 : 0), ROUNDS - 1)
  const shape = shapes[round].points

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const read = () => {
      const s = getComputedStyle(c)
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f
      colors.current = { fill: v('--game', '#dbe'), edge: v('--edge', '#000'), ink: v('--ink', '#000'), muted: v('--ink-muted', '#666') }
      draw()
    }
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      c.width = c.height = Math.round(e.contentRect.width * dpr)
      read()
    })
    ro.observe(c)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', read)
    return () => { ro.disconnect(); mq.removeEventListener('change', read) }
  }, [phase === 'done']) // eslint-disable-line react-hooks/exhaustive-deps

  function draw() {
    const c = canvas.current, col = colors.current
    if (!c || !col) return
    const g = c.getContext('2d')!
    const k = c.width / SIZE
    g.clearRect(0, 0, c.width, c.height)
    g.lineCap = 'round'; g.lineJoin = 'round'
    if (phase === 'show' || phase === 'compare') {
      // The shape: edge then fill colour, so it reads in both themes.
      g.setLineDash(phase === 'compare' ? [14 * k, 10 * k] : [])
      // Exactly the points that are scored: straight between them (curves are dense enough to look smooth).
      const poly = () => { g.beginPath(); shape.forEach((p, i) => (i ? g.lineTo(p.x * k, p.y * k) : g.moveTo(p.x * k, p.y * k))); g.stroke() }
      g.strokeStyle = col.edge; g.lineWidth = 15 * k; poly()
      g.strokeStyle = col.fill; g.lineWidth = 10 * k; poly()
      g.setLineDash([])
    }
    if (phase === 'draw' || phase === 'compare') {
      g.strokeStyle = col.ink; g.lineWidth = 5 * k
      drawStroke(g, stroke.current, k)
    }
    if (phase === 'draw' && !stroke.current.length) {
      g.fillStyle = col.muted; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.font = `700 ${Math.round(15 * k)}px Figtree, system-ui, sans-serif`
      g.fillText('Draw it from memory, in one stroke', c.width / 2, c.height / 2)
    }
  }
  useEffect(draw, [phase, round]) // eslint-disable-line react-hooks/exhaustive-deps

  // Every shape starts with GetReady, which brings the canvas on screen and counts 3-2-1.
  function show() {
    stroke.current = []
    setPhase('countdown')
  }
  function startShow() {
    setPhase('show')
    const start = performance.now()
    setLeft(SHOW_MS)
    const tick = () => {
      const l = SHOW_MS - (performance.now() - start)
      if (l <= 0) { setPhase('draw'); return }
      setLeft(l)
      setTimeout(tick, 50)
    }
    setTimeout(tick, 50)
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== 'draw') return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    stroke.current = pointsFrom(e.nativeEvent, e.currentTarget, SIZE, SIZE)
    draw()
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    stroke.current.push(...pointsFrom(e.nativeEvent, e.currentTarget, SIZE, SIZE))
    draw()
  }
  function onUp() {
    if (!drawing.current) return
    drawing.current = false
    if (length(stroke.current) < 30) { stroke.current = []; draw(); return } // a tap, not a drawing
    const s = matchScore(shape, stroke.current)
    if (s >= 85) { feel.chime(scores.length + 2); feel.medium() } else if (s >= 65) { feel.good() } else { feel.bad() }
    const next = [...scores, s]
    setScores(next)
    setPhase('compare')
    if (next.length === ROUNDS) {
      const all = [...tries, next]
      pending.current = all
      if (!oneOff) {
        saveToday(game.slug, all)
        const best = Math.max(...all.map(average))
        recordDaily(game.slug, best, new Date(), `${best}%`)
      }
      setFresh(true)
    }
  }

  function again() {
    setScores([])
    setPhase('ready')
  }

  if (phase === 'done' && tries.length) {
    const bestTry = tries.reduce((a, b) => (average(b) > average(a) ? b : a))
    const best = average(bestTry)
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <>
        <Stage><div className="stack" style={{ justifyItems: 'center' }}><AttemptTiles attempts={bestTry.map(grade)} /></div></Stage>
        <ResultCard
          game={game}
          headline={`${best}% match`}
          detail={<>Three shapes from memory · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`✍️ Shape Recall ${puzzleLabel(day)}\n${bestTry.map(square).join('')} ${best}% match\nBest of ${n}`}
          finishData={{ score: best, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best, text: `${best}%`, lowerIsBetter: false }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  const last = scores[scores.length - 1]
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">Shape {round + 1} of {ROUNDS}</span>
        <AttemptTiles attempts={Array.from({ length: ROUNDS }, (_, i) => (i < scores.length ? grade(scores[i]) : 'empty'))} />
      </div>
      <Stage flush className="sr2-stage" style={{ position: 'relative' }}>
        <canvas
          ref={canvas}
          className="sr2-canvas"
          role="application"
          aria-label={phase === 'show' ? 'Remember this shape' : 'Draw the shape from memory in one stroke'}
          data-shape={phase === 'show' ? JSON.stringify(shape.map((p) => [Math.round(p.x), Math.round(p.y)])) : undefined}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        {phase === 'countdown' && <GetReady onDone={startShow} />}
        {phase === 'show' && <span className="sr2-timer" style={{ width: `${(left / SHOW_MS) * 100}%` }} aria-hidden="true" />}
        {phase === 'compare' && last >= 85 && <Burst y="12%" color={game.color} />}
        {phase === 'compare' && <span className="sr2-score" aria-live="polite">{last}%</span>}
      </Stage>
      <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {phase === 'ready' && <Button size="lg" block color={game.color} onClick={show} data-primary="click" hint="Space">{scores.length ? `Show shape ${scores.length + 1} of ${ROUNDS}` : 'Show the first shape'}</Button>}
        {phase === 'compare' && scores.length < ROUNDS && <Button size="lg" block color={game.color} onClick={show} data-primary="click" hint="Space">Next shape ({scores.length + 1} of {ROUNDS})</Button>}
        {phase === 'compare' && scores.length === ROUNDS && <Button size="lg" block color={game.color} onClick={() => { if (pending.current) setTries(pending.current); pending.current = null; setPhase('done') }} data-primary="click" hint="Space">See my result</Button>}
        <p className="small muted center" style={{ margin: 0 }}>
          {phase === 'compare' ? 'Dashed: the shape. Solid: yours. Size and position don’t matter, only the shape.' : 'Each shape shows for 2 seconds. Then draw it with your finger or the mouse.'}
        </p>
      </div>
    </>
  )
}
