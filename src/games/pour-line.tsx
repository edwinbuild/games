import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { dayFor, FALL_S, landedAt, levelFor, PERFECT, result, SHAPES, type Pour } from './pour-line/glass'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Stage } from '../ui/components'

const game = getGame('pour-line')
/** Seconds the surface keeps settling after the last drop lands, before the result shows. */
const SETTLE_S = 0.7
type Try = number | null // percent off the line, or null for a spill
type Phase = 'ready' | 'pour' | 'settle' | 'shown' | 'done'
type Colors = { foam: string; liquid: string; edge: string; ink: string; muted: string; paper: string; good: string; bad: string }

const fmt = (off: number) => `${off.toFixed(1)}% off`
const bestOf = (tries: Try[]) => tries.reduce<number | null>((b, t) => (t != null && (b == null || t < b) ? t : b), null)

export default function PourLine() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const glass = useMemo(() => dayFor(seed), [seed])
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday(game.slug, [] as Try[])))
  const [phase, setPhase] = useState<Phase>(tries.length ? 'done' : 'ready')
  const [last, setLast] = useState<Pour | null>(null)
  const [fresh, setFresh] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const size = useRef({ w: 300, h: 420, dpr: 1 })
  const colors = useRef<Colors | null>(null)
  const reduced = useRef(false)
  // Timing lives in refs so the animation loop never waits for React.
  const pressAt = useRef(0)
  const releaseAt = useRef(Infinity) // seconds after press
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches
    const read = () => {
      const s = getComputedStyle(c)
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f
      colors.current = { foam: v('--highlight', '#fff'), liquid: v('--game', '#fc6'), edge: v('--edge', '#000'), ink: v('--ink', '#000'), muted: v('--ink-muted', '#666'), paper: v('--surface', '#fff'), good: v('--success', '#096'), bad: v('--danger', '#c00') }
    }
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      size.current = { w: e.contentRect.width, h: e.contentRect.height, dpr }
      c.width = Math.round(e.contentRect.width * dpr)
      c.height = Math.round(e.contentRect.height * dpr)
      read()
    })
    ro.observe(c)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', read)
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { ro.disconnect(); mq.removeEventListener('change', read); mo.disconnect() }
  }, [phase === 'done'])

  // The animation loop: draws, and moves the phase on when the pour lands or spills.
  useEffect(() => {
    if (phase === 'done') return
    let raf = 0
    const frame = () => {
      const now = performance.now()
      const t = phaseRef.current === 'ready' ? 0 : (now - pressAt.current) / 1000
      const landed = phaseRef.current === 'ready' ? 0 : landedAt(glass, t, releaseAt.current)
      if (phaseRef.current === 'pour' && landed > 1) finish(t) // over the rim: the try ends now
      if (phaseRef.current === 'settle' && t > releaseAt.current + FALL_S + SETTLE_S) show()
      draw(t, Math.min(landed, 1))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function draw(t: number, landed: number) {
    const c = canvas.current, col = colors.current
    if (!c || !col) return
    const g = c.getContext('2d')!
    const { dpr } = size.current
    const W = c.width, H = c.height
    g.clearRect(0, 0, W, H)
    const gh = H * 0.62 // glass height in canvas pixels
    const bottom = H * 0.94
    const cx = W / 2
    const width = (y: number) => SHAPES[glass.shape](y) * gh
    const yOf = (h: number) => bottom - h * gh
    const wall = (side: -1 | 1) => {
      const pts: [number, number][] = []
      for (let i = 0; i <= 40; i++) { const h = i / 40; pts.push([cx + (side * width(h)) / 2, yOf(h)]) }
      return pts
    }
    const left = wall(-1), right = wall(1)
    const outline = () => {
      g.beginPath()
      left.slice().reverse().forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      right.forEach(([x, y]) => g.lineTo(x, y))
    }
    const level = levelFor(glass.shape, landed)
    const sy = yOf(level)
    const released = releaseAt.current
    const pouring = phaseRef.current === 'pour' || (phaseRef.current === 'settle' && t < released + FALL_S)
    const calm = reduced.current ? 0 : pouring ? 1 : Math.exp(-(t - released - FALL_S) * 4)

    // Liquid, clipped to the inside of the glass, with a surface that ripples while pouring.
    if (landed > 0) {
      g.save()
      outline(); g.closePath(); g.clip()
      const amp = 3.5 * dpr * calm
      g.beginPath()
      g.moveTo(0, H)
      for (let x = 0; x <= W; x += 6 * dpr) g.lineTo(x, sy + Math.sin(x / (18 * dpr) + t * 9) * amp + Math.sin(x / (7 * dpr) - t * 13) * amp * 0.4)
      g.lineTo(W, H)
      g.closePath()
      g.fillStyle = col.liquid
      g.fill()
      // Foam on top while it pours, thinning as it settles.
      const foam = 5 * dpr * (0.35 + 0.65 * calm)
      g.fillStyle = col.foam
      g.globalAlpha = 0.9
      g.beginPath()
      for (let x = 0; x <= W; x += 6 * dpr) g.lineTo(x, sy + Math.sin(x / (18 * dpr) + t * 9) * amp + Math.sin(x / (7 * dpr) - t * 13) * amp * 0.4)
      for (let x = W; x >= 0; x -= 6 * dpr) g.lineTo(x, sy + foam + Math.sin(x / (11 * dpr) + t * 5) * dpr)
      g.closePath(); g.fill()
      g.globalAlpha = 1
      // Bubbles rising.
      if (!reduced.current) {
        g.strokeStyle = col.edge
        g.lineWidth = 1.2 * dpr
        g.globalAlpha = 0.45 * (0.3 + 0.7 * calm)
        const depth = bottom - sy
        for (let i = 0; i < 9; i++) {
          const bx = cx + Math.sin(i * 2.4) * width(level * 0.5) * 0.35
          const by = bottom - (((t * (22 + i * 5) * dpr) + i * 37 * dpr) % Math.max(1, depth))
          if (by > sy + foam) { g.beginPath(); g.arc(bx, by, (1.6 + (i % 3)) * dpr, 0, Math.PI * 2); g.stroke() }
        }
        g.globalAlpha = 1
      }
      g.restore()
    }

    // The stream from the tap to the surface: its head falls on the press, its tail falls after release.
    const tapY = H * 0.13
    if (phaseRef.current !== 'ready') {
      const fallTo = Math.min(sy, bottom)
      const head = tapY + Math.min(1, t / FALL_S) * (fallTo - tapY)
      const tail = released === Infinity ? tapY : tapY + Math.min(1, Math.max(0, (t - released) / FALL_S)) * (fallTo - tapY)
      if (head > tail) {
        g.fillStyle = col.liquid
        g.strokeStyle = col.edge
        g.lineWidth = 1.5 * dpr
        const sw = 7 * dpr
        g.fillRect(cx - sw / 2, tail, sw, head - tail)
        g.strokeRect(cx - sw / 2, tail, sw, head - tail)
      }
    }
    // The tap.
    g.fillStyle = col.paper
    g.strokeStyle = col.edge
    g.lineWidth = 2.5 * dpr
    g.beginPath()
    g.roundRect(cx - 40 * dpr, H * 0.04, 52 * dpr, 16 * dpr, 4 * dpr)
    g.roundRect(cx - 9 * dpr, H * 0.04 + 14 * dpr, 18 * dpr, tapY - H * 0.04 - 14 * dpr, 3 * dpr)
    g.fill(); g.stroke()

    // The line, with ticks outside the glass.
    const ly = yOf(glass.line)
    const lw = width(glass.line)
    const shown = phaseRef.current === 'shown'
    const good = shown && last && !last.spilled && last.perfect
    g.strokeStyle = good ? col.good : col.ink
    g.lineWidth = (good ? 4 : 2.5) * dpr
    g.setLineDash([7 * dpr, 6 * dpr])
    g.beginPath(); g.moveTo(cx - lw / 2 - 14 * dpr, ly); g.lineTo(cx + lw / 2 + 14 * dpr, ly); g.stroke()
    g.setLineDash([])
    g.fillStyle = col.muted
    g.font = `700 ${Math.round(12 * dpr)}px Figtree, system-ui, sans-serif`
    g.textAlign = 'right'
    g.textBaseline = 'bottom'
    g.fillText('LINE', cx + lw / 2 - 6 * dpr, ly - 5 * dpr)

    // The glass itself, drawn last so its edge sits over the liquid.
    g.strokeStyle = col.edge
    g.lineWidth = 3 * dpr
    g.lineJoin = 'round'
    outline(); g.stroke()
    g.beginPath(); g.moveTo(left[0][0], bottom); g.lineTo(right[0][0], bottom); g.stroke()

    // Spill: drips running down the outside.
    if (phaseRef.current === 'shown' && last?.spilled && !reduced.current) {
      g.fillStyle = col.liquid
      for (const side of [-1, 1] as const) {
        const [rx, ry] = side < 0 ? left[40] : right[40]
        const drop = Math.min(gh * 0.9, (t - releaseAt.current) * 260 * dpr)
        g.fillRect(rx + side * 2 * dpr - 3 * dpr, ry, 6 * dpr, drop)
      }
    }

    // Prompt or result text at the top.
    g.textAlign = 'center'
    g.textBaseline = 'top'
    if (phaseRef.current === 'ready') {
      g.fillStyle = col.muted
      g.font = `700 ${Math.round(15 * dpr)}px Figtree, system-ui, sans-serif`
      g.fillText('Press and hold to pour', cx, H * 0.24)
    } else if (shown && last) {
      g.fillStyle = last.spilled ? col.bad : col.ink
      g.font = `800 ${Math.round(30 * dpr)}px "Bricolage Grotesque", system-ui, sans-serif`
      g.fillText(last.spilled ? 'Spilled!' : last.perfect ? `Perfect · ${fmt(last.off)}` : fmt(last.off), cx, H * 0.22)
    }
  }

  function press() {
    if (phaseRef.current !== 'ready') return
    pressAt.current = performance.now()
    releaseAt.current = Infinity
    setLast(null)
    setPhase('pour')
    phaseRef.current = 'pour'
    feel.light()
    feel.pour(true)
  }
  function release() {
    if (phaseRef.current !== 'pour') return
    releaseAt.current = (performance.now() - pressAt.current) / 1000
    feel.pour(false)
    setPhase('settle')
    phaseRef.current = 'settle'
  }
  // Over the rim: stop as if released at the moment it spilled.
  function finish(t: number) {
    releaseAt.current = Math.min(releaseAt.current, t)
    feel.pour(false)
    show()
  }
  function show() {
    const r = result(glass, releaseAt.current)
    setLast(r)
    setPhase('shown')
    phaseRef.current = 'shown'
    if (r.spilled) feel.bad()
    else if (r.perfect) { feel.chime(4); feel.success() }
    else feel.thud()
    const all: Try[] = [...tries, r.spilled ? null : r.off]
    setTries(all)
    const best = bestOf(all)
    if (!oneOff) {
      saveToday(game.slug, all)
      // An all-spill day still counts as played (streak), with no score.
      recordDaily(game.slug, best, new Date(), best == null ? 'Spilled' : fmt(best), true)
    }
    setFresh(true)
    setTimeout(() => setPhase('done'), !r.spilled && r.perfect ? 1600 : 1200)
  }
  function again() {
    setLast(null)
    setPhase('ready')
  }

  // Space pours by holding; the global Space shortcut is not used here, because pouring needs the release too.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || (e.target as HTMLElement | null)?.closest('input, textarea, button, a')) return
      e.preventDefault()
      press()
    }
    const up = (e: KeyboardEvent) => { if (e.key === ' ') release() }
    const pointerUp = () => release()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('pointerup', pointerUp)
    window.addEventListener('pointercancel', pointerUp)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('pointerup', pointerUp)
      window.removeEventListener('pointercancel', pointerUp)
      feel.pour(false)
    }
  })

  if (phase === 'done' && tries.length) {
    const best = bestOf(tries)
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    const lastTry = tries[tries.length - 1]
    return (
      <>
        {fresh && (
          <Stage>
            <p className="body-strong center" style={{ margin: 0 }}>Last try: {lastTry == null ? 'spilled' : fmt(lastTry)}</p>
          </Stage>
        )}
        <ResultCard
          game={game}
          headline={best == null ? 'Spilled' : `${fmt(best)} the line`}
          detail={<>{best == null ? 'Every try went over the rim' : best <= PERFECT ? 'A perfect pour' : 'Closest pour'} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🥛 Pour Line ${puzzleLabel(day)}\n${best == null ? 'Spilled it' : `${fmt(best)} the line`}\nBest of ${n}`}
          finishData={{ score: best ?? -1, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best ?? 999, text: best == null ? 'Spilled' : fmt(best), lowerIsBetter: true }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <Stage
      flush
      className="pl-stage"
      role="button"
      tabIndex={0}
      aria-label="Press and hold to pour, let go to stop"
      onPointerDown={(e) => { e.preventDefault(); press() }}
    >
      <canvas ref={canvas} className="pl-canvas" aria-hidden="true" />
      {phase === 'ready' && <kbd className="qg-kbd pl-kbd" aria-hidden="true">Hold Space</kbd>}
      {phase === 'shown' && last && !last.spilled && last.perfect && <Burst y="30%" color={game.color} />}
    </Stage>
  )
}
