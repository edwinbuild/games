import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { channelFor, H, halfWidth, percent, START_R, step, W } from './steady-line/channel'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { drawStroke, pointsFrom, type P } from '../shell/ink'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Stage } from '../ui/components'

const game = getGame('steady-line')
type Try = { pct: number; time: number | null }
type Phase = 'ready' | 'trace' | 'over' | 'done'
type Colors = { fill: string; edge: string; ink: string; muted: string; surface: string; sunken: string; bad: string }
/** Full runs beat partial ones; among full runs, faster wins. */
const better = (a: Try, b: Try) => (a.pct !== b.pct ? a.pct > b.pct : (a.time ?? 1e9) < (b.time ?? 1e9))
const label = (t: Try) => (t.pct === 100 ? `${t.time!.toFixed(1)}s` : `${t.pct}%`)

export default function SteadyLine() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const ch = useMemo(() => channelFor(seed), [seed])
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday(game.slug, [] as Try[])))
  const [phase, setPhase] = useState<Phase>(tries.length ? 'done' : 'ready')
  const [last, setLast] = useState<(Try & { letGo?: boolean }) | null>(null)
  const [fresh, setFresh] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const colors = useRef<Colors | null>(null)
  const run = useRef<{ trail: P[]; s: number; start: number; crash: P | null }>({ trail: [], s: 0, start: 0, crash: null })
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const read = () => {
      const s = getComputedStyle(c)
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f
      colors.current = { fill: v('--game', '#bdb'), edge: v('--edge', '#000'), ink: v('--ink', '#000'), muted: v('--ink-muted', '#666'), surface: v('--surface', '#fff'), sunken: v('--surface-sunken', '#eee'), bad: v('--danger', '#c00') }
      draw()
    }
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
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
  }, [phase === 'done']) // eslint-disable-line react-hooks/exhaustive-deps

  // The channel is drawn once per change; the trail is added as you move (no animation loop needed).
  function draw() {
    const c = canvas.current, col = colors.current
    if (!c || !col) return
    const g = c.getContext('2d')!
    const k = c.width / W
    g.clearRect(0, 0, c.width, c.height)
    g.lineCap = 'round'; g.lineJoin = 'round'
    // Walls then floor of the channel, segment by segment so it can narrow.
    for (const [style, extra] of [[col.edge, 3], [col.surface, 0]] as const) {
      g.strokeStyle = style
      for (let i = 1; i < ch.points.length; i++) {
        g.lineWidth = (halfWidth(ch, ch.lengths[i]) * 2 + extra * 2) * k
        g.beginPath(); g.moveTo(ch.points[i - 1].x * k, ch.points[i - 1].y * k); g.lineTo(ch.points[i].x * k, ch.points[i].y * k); g.stroke()
      }
    }
    // Progress so far, tinted.
    const R = run.current
    if (R.s > 0) {
      g.strokeStyle = col.fill
      for (let i = 1; i < ch.points.length && ch.lengths[i] <= R.s; i++) {
        g.lineWidth = halfWidth(ch, ch.lengths[i]) * 2 * k
        g.beginPath(); g.moveTo(ch.points[i - 1].x * k, ch.points[i - 1].y * k); g.lineTo(ch.points[i].x * k, ch.points[i].y * k); g.stroke()
      }
    }
    // Start and finish.
    const s0 = ch.points[0], f = ch.points[ch.points.length - 1]
    g.fillStyle = col.fill; g.strokeStyle = col.edge; g.lineWidth = 3 * k
    g.beginPath(); g.arc(s0.x * k, s0.y * k, START_R * k * 0.8, 0, Math.PI * 2); g.fill(); g.stroke()
    g.fillStyle = col.ink; g.font = `800 ${Math.round(8 * k)}px Figtree, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText('START', s0.x * k, s0.y * k)
    g.font = `${Math.round(20 * k)}px system-ui, sans-serif`
    g.fillText('🏁', f.x * k, (f.y - 20) * k)
    // The trail.
    g.strokeStyle = col.ink; g.lineWidth = 3.5 * k
    drawStroke(g, R.trail, k)
    if (R.crash) {
      g.strokeStyle = col.bad; g.lineWidth = 4 * k
      g.beginPath(); g.arc(R.crash.x * k, R.crash.y * k, 9 * k, 0, Math.PI * 2); g.stroke()
    }
  }

  function end(pct: number, time: number | null, letGo = false) {
    const t = { pct, time }
    setLast({ ...t, letGo })
    setPhase('over')
    phaseRef.current = 'over'
    if (pct === 100) { feel.chime(4); feel.success() } else feel.bad()
    const all = [...tries, t]
    setTries(all)
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = all.reduce((a, b) => (better(b, a) ? b : a))
      recordDaily(game.slug, best.pct * 1000 - (best.time ?? 999), new Date(), label(best))
    }
    setFresh(true)
    setTimeout(() => setPhase('done'), pct === 100 ? 1500 : 1100)
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phaseRef.current !== 'ready') return
    const [p] = pointsFrom(e.nativeEvent, e.currentTarget, W, H)
    const s0 = ch.points[0]
    if (Math.hypot(p.x - s0.x, p.y - s0.y) > START_R) { feel.tap(); return }
    e.currentTarget.setPointerCapture(e.pointerId)
    run.current = { trail: [p], s: 0, start: performance.now(), crash: null }
    setPhase('trace')
    phaseRef.current = 'trace'
    feel.light()
    draw()
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phaseRef.current !== 'trace') return
    const R = run.current
    for (const p of pointsFrom(e.nativeEvent, e.currentTarget, W, H)) {
      const r = step(ch, p, R.s)
      R.trail.push(p)
      if (!r.ok) { R.crash = p; draw(); return end(percent(ch, R.s), null) }
      R.s = r.s
      if (percent(ch, R.s) >= 100) { draw(); return end(100, Math.round((performance.now() - R.start) / 100) / 10) }
    }
    draw()
  }
  function onUp() {
    if (phaseRef.current !== 'trace') return
    end(percent(ch, run.current.s), null, true)
  }

  function again() {
    run.current = { trail: [], s: 0, start: 0, crash: null }
    setLast(null)
    setPhase('ready')
  }
  useEffect(() => { if (phase === 'ready') draw() }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done' && tries.length) {
    const best = tries.reduce((a, b) => (better(b, a) ? b : a))
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <>
        {fresh && last && <Stage><p className="body-strong center" style={{ margin: 0 }}>Last try: {last.pct === 100 ? `all the way in ${last.time!.toFixed(1)}s` : `${last.pct}% of the way`}</p></Stage>}
        <ResultCard
          game={game}
          headline={best.pct === 100 ? `All the way in ${best.time!.toFixed(1)}s` : `${best.pct}% of the way`}
          detail={<>Best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`〰️ Steady Line ${puzzleLabel(day)}\n${best.pct === 100 ? `Made it all the way in ${best.time!.toFixed(1)}s` : `Got ${best.pct}% of the way`}\nBest of ${n}`}
          finishData={{ pct: best.pct, time: best.time ?? -1, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best.pct * 1000 - (best.time ?? 999), text: label(best), lowerIsBetter: false }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <>
      <Stage flush className="sl-stage" style={{ position: 'relative' }}>
        <canvas
          ref={canvas}
          className="sl-canvas"
          role="application"
          aria-label="A winding channel. Put your finger on Start and trace to the flag without touching the edges."
          data-path={JSON.stringify(ch.points.filter((_, i) => i % 4 === 0 || i === ch.points.length - 1).map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]))}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        {phase === 'over' && last?.pct === 100 && <Burst y="8%" color={game.color} />}
      </Stage>
      <p className="small muted center" style={{ margin: 'var(--space-2) 0 0' }} aria-live="polite">
        {phase === 'over' && last ? (last.pct === 100 ? `All the way in ${last.time!.toFixed(1)}s!` : last.letGo ? `You let go at ${last.pct}%` : `Touched the edge at ${last.pct}%`) : 'Put your finger on Start and trace to the flag. Don’t touch the edges, and don’t lift your finger.'}
      </p>
    </>
  )
}
