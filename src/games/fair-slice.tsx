import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { average, clipLeft, grade, offBy, shapesFor, SIZE, split, type Poly, type Pt } from './fair-slice/geometry'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { AttemptTiles, Burst, Stage } from '../ui/components'

const game = getGame('fair-slice')
const ROUNDS = 5
/** A cut within this much of 50/50 is perfect. */
const PERFECT = 0.5
/** Swipes shorter than this (world units) are taps, not cuts. */
const MIN_SWIPE = 40
const square = (off: number) => ({ hit: '🟩', near: '🟨', miss: '🟥' })[grade(off)]
type Cut = { a: Pt; b: Pt; left: number; right: number; off: number; at: number }
type Colors = { fill: string; edge: string; ink: string; muted: string; focus: string; surface: string }

export default function FairSlice() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const shapes = useMemo(() => shapesFor(seed), [seed])
  const [tries, setTries] = useState<number[][]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[][])))
  // The try in progress survives a refresh.
  const [offs, setOffs] = useRunState<number[]>(`${game.slug}:${seed}:${oneOff ? 'once' : tries.length}`, [])
  const [done, setDone] = useState(tries.length > 0 && offs.length === 0)
  const cutTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(cutTimer.current), [])
  const [fresh, setFresh] = useState(false)
  const [cut, setCut] = useState<Cut | null>(null)
  const [keyboard, setKeyboard] = useState(false)
  const round = offs.length - (cut ? 1 : 0)
  const shape = shapes[Math.min(round, ROUNDS - 1)].poly
  const canvas = useRef<HTMLCanvasElement>(null)
  const size = useRef({ w: 300, dpr: 1 })
  const colors = useRef<Colors | null>(null)
  const reduced = useRef(false)
  const swipe = useRef<{ from: Pt; to: Pt } | null>(null)
  const guide = useRef({ angle: 0.35, offset: 45 })
  const live = useRef({ shape, cut, keyboard })
  live.current = { shape, cut, keyboard }

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches
    const read = () => {
      const s = getComputedStyle(c)
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f
      colors.current = { fill: v('--game', '#fb8'), edge: v('--edge', '#000'), ink: v('--ink', '#000'), muted: v('--ink-muted', '#666'), focus: v('--focus', '#06f'), surface: v('--surface', '#fff') }
    }
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      size.current = { w: e.contentRect.width, dpr }
      c.width = c.height = Math.round(e.contentRect.width * dpr)
      read()
    })
    ro.observe(c)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', read)
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { ro.disconnect(); mq.removeEventListener('change', read); mo.disconnect() }
  }, [done])

  useEffect(() => {
    if (done) return
    let raf = 0
    const frame = () => { draw(); raf = requestAnimationFrame(frame) }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  /** The guide line for keyboard cutting: through a point `offset` from the centre, at `angle`. */
  function guideLine(): [Pt, Pt] {
    const { angle, offset } = guide.current
    const nx = -Math.sin(angle), ny = Math.cos(angle)
    const cx = SIZE / 2 + nx * offset, cy = SIZE / 2 + ny * offset
    return [{ x: cx - Math.cos(angle) * 400, y: cy - Math.sin(angle) * 400 }, { x: cx + Math.cos(angle) * 400, y: cy + Math.sin(angle) * 400 }]
  }

  function draw() {
    const c = canvas.current, col = colors.current
    if (!c || !col) return
    const g = c.getContext('2d')!
    const { dpr } = size.current
    const k = c.width / SIZE
    const { shape: poly, cut: cu, keyboard: kb } = live.current
    g.clearRect(0, 0, c.width, c.height)
    const path = (p: Poly) => { g.beginPath(); p.forEach((q, i) => (i ? g.lineTo(q.x * k, q.y * k) : g.moveTo(q.x * k, q.y * k))); g.closePath() }
    const paint = (p: Poly) => {
      g.fillStyle = col.fill; g.strokeStyle = col.edge; g.lineWidth = 3 * dpr; g.lineJoin = 'round'
      path(p); g.fill(); g.stroke()
    }
    if (!cu) {
      paint(poly)
      const line = swipe.current ? [swipe.current.from, swipe.current.to] : kb ? guideLine() : null
      if (line) {
        g.strokeStyle = swipe.current ? col.ink : col.focus
        g.lineWidth = (swipe.current ? 4 : 3) * dpr
        g.setLineDash(swipe.current ? [] : [10 * dpr, 7 * dpr])
        g.beginPath(); g.moveTo(line[0].x * k, line[0].y * k); g.lineTo(line[1].x * k, line[1].y * k); g.stroke()
        g.setLineDash([])
      }
      g.fillStyle = col.muted
      g.font = `700 ${Math.round(14 * dpr)}px Figtree, system-ui, sans-serif`
      g.textAlign = 'center'; g.textBaseline = 'top'
      if (!swipe.current && !kb) g.fillText('Swipe across the shape to cut it', c.width / 2, 8 * dpr)
      return
    }
    // After the cut: the halves spring apart along the cut's normal, each showing its share.
    const t = (performance.now() - cu.at) / 1000
    const len = Math.hypot(cu.b.x - cu.a.x, cu.b.y - cu.a.y)
    const nx = -(cu.b.y - cu.a.y) / len, ny = (cu.b.x - cu.a.x) / len
    const spring = reduced.current ? 12 : 12 * (1 - Math.exp(-t * 9) * Math.cos(t * 14))
    const pieces: [Poly, number, number][] = [
      [clipLeft(poly, cu.a, cu.b), cu.left, 1],
      [clipLeft(poly, cu.b, cu.a), cu.right, -1],
    ]
    for (const [piece, share, dir] of pieces) {
      if (piece.length < 3) continue
      g.save()
      g.translate(nx * spring * dir * k, ny * spring * dir * k)
      paint(piece)
      const cx = piece.reduce((s, p) => s + p.x, 0) / piece.length, cy = piece.reduce((s, p) => s + p.y, 0) / piece.length
      g.font = `800 ${Math.round(20 * dpr)}px "Bricolage Grotesque", system-ui, sans-serif`
      g.textAlign = 'center'; g.textBaseline = 'middle'
      const label = `${share.toFixed(1)}%`
      const w = g.measureText(label).width + 14 * dpr
      g.fillStyle = col.surface; g.strokeStyle = col.edge; g.lineWidth = 2 * dpr
      g.beginPath(); g.roundRect(cx * k - w / 2, cy * k - 15 * dpr, w, 30 * dpr, 8 * dpr); g.fill(); g.stroke()
      g.fillStyle = col.ink
      g.fillText(label, cx * k, cy * k + 1 * dpr)
      g.restore()
    }
    // The cut line flashes.
    if (t < 0.35) {
      g.globalAlpha = 1 - t / 0.35
      g.strokeStyle = col.ink
      g.lineWidth = 4 * dpr
      g.beginPath(); g.moveTo(cu.a.x * k, cu.a.y * k); g.lineTo(cu.b.x * k, cu.b.y * k); g.stroke()
      g.globalAlpha = 1
    }
  }

  function makeCut(a: Pt, b: Pt) {
    if (cut || done) return
    const s = split(shape, a, b)
    if (Math.min(s.left, s.right) <= 0) return // missed the shape
    const off = offBy(s)
    feel.slice()
    if (off <= PERFECT) { feel.chime(offs.length); feel.success() } else if (off <= 1) feel.good()
    const next = [...offs, off]
    setOffs(next)
    setCut({ a, b, left: s.left, right: s.right, off, at: performance.now() })
    // The fifth cut finishes the try now, so a refresh during the cut animation can't lose it.
    const list = next.length === ROUNDS ? record(next) : null
    cutTimer.current = setTimeout(() => {
      setCut(null)
      guide.current = { angle: 0.35 + next.length * 0.6, offset: 45 }
      if (list) { setTries(list); setDone(true) }
    }, off <= PERFECT ? 1500 : 1200)
  }

  function record(all: number[]): number[][] {
    const list = [...tries, all]
    if (!oneOff) {
      saveToday(game.slug, list)
      const best = Math.min(...list.map(average))
      recordDaily(game.slug, best, new Date(), `${best.toFixed(1)}% off`, true)
    }
    setFresh(true)
    return list
  }

  function again() {
    setOffs([])
    setCut(null)
    setDone(false)
  }

  // Pointer: a swipe is a straight cut from where the finger went down to where it came up.
  function toWorld(e: { clientX: number; clientY: number }, el: Element): Pt {
    const r = el.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE }
  }

  // Keyboard: arrows turn and move the guide, Space or Enter cuts along it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || cut || e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest('input, textarea, button, a')) return
      const fine = e.shiftKey ? 0.25 : 1
      const moves: Record<string, () => void> = {
        ArrowLeft: () => (guide.current.angle -= 0.05 * fine),
        ArrowRight: () => (guide.current.angle += 0.05 * fine),
        ArrowUp: () => (guide.current.offset -= 2 * fine),
        ArrowDown: () => (guide.current.offset += 2 * fine),
      }
      if (e.key in moves) {
        e.preventDefault()
        setKeyboard(true)
        moves[e.key]()
      } else if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault()
        setKeyboard(true)
        const [a, b] = guideLine()
        makeCut(a, b)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done && tries.length) {
    const bestTry = tries.reduce((a, b) => (average(b) < average(a) ? b : a))
    const best = average(bestTry)
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <>
        <Stage>
          <div className="stack" style={{ justifyItems: 'center' }}>
            <AttemptTiles attempts={bestTry.map(grade)} />
            {fresh && <p className="body-strong" style={{ margin: 0 }}>Last try: {average(tries[tries.length - 1]).toFixed(1)}% off on average</p>}
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={`${best.toFixed(1)}% off`}
          detail={<>Average over five cuts · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🔪 Fair Slice ${puzzleLabel(day)}\n${bestTry.map(square).join('')} ${best.toFixed(1)}% off\nBest of ${n}`}
          finishData={{ score: best, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best, text: `${best.toFixed(1)}% off`, lowerIsBetter: true }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">Shape {Math.min(round + 1, ROUNDS)} of {ROUNDS}</span>
        <AttemptTiles attempts={Array.from({ length: ROUNDS }, (_, i) => (i < offs.length ? grade(offs[i]) : 'empty'))} />
      </div>
      <Stage
        flush
        className="fs-stage"
        role="application"
        aria-label={`Shape ${round + 1} of ${ROUNDS}. Swipe across it to cut it into two equal halves, or use the arrow keys and Space.`}
        onPointerDown={(e) => {
          if (cut) return
          e.currentTarget.setPointerCapture(e.pointerId)
          const p = toWorld(e, e.currentTarget)
          swipe.current = { from: p, to: p }
        }}
        onPointerMove={(e) => { if (swipe.current) swipe.current.to = toWorld(e, e.currentTarget) }}
        onPointerUp={(e) => {
          const s = swipe.current
          swipe.current = null
          if (!s) return
          const to = toWorld(e, e.currentTarget)
          if (Math.hypot(to.x - s.from.x, to.y - s.from.y) >= MIN_SWIPE) makeCut(s.from, to)
        }}
        onPointerCancel={() => (swipe.current = null)}
      >
        <canvas ref={canvas} className="fs-canvas" aria-hidden="true" />
        {!cut && <kbd className="qg-kbd fs-kbd" aria-hidden="true">Arrows · Space</kbd>}
        {cut && cut.off <= PERFECT && <Burst color={game.color} />}
      </Stage>
      <p className="small muted center" style={{ margin: 'var(--space-2) 0 0' }} aria-live="polite">
        {cut ? (cut.off <= PERFECT ? `Perfect! ${cut.left.toFixed(1)}% / ${cut.right.toFixed(1)}%` : `${cut.left.toFixed(1)}% / ${cut.right.toFixed(1)}% · ${cut.off.toFixed(1)}% off`) : 'Cut it into two equal halves.'}
      </p>
    </>
  )
}
