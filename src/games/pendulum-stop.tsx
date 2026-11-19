import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { AMPLITUDE, angleAt, inZone, roundFor } from './pendulum-stop/swing'
import { newSeed, readChallenge } from '../shell/challenge'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, recordPlay } from '../shell/stats'
import { Burst, Stage } from '../ui'

const game = getGame('pendulum-stop')
/** Pause after a good stop before the next swing starts. */
const BETWEEN = 650
type Phase = 'ready' | 'swing' | 'hit' | 'miss' | 'done'
type Colors = { fill: string; edge: string; ink: string; muted: string; surface: string; sunken: string; good: string; bad: string }

export default function PendulumStop() {
  const challenge = readChallenge(game.slug)
  const [seed, setSeed] = useState(() => challenge?.s ?? newSeed())
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [fresh, setFresh] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const size = useRef({ dpr: 1 })
  const colors = useRef<Colors | null>(null)
  const reduced = useRef(false)
  const live = useRef({ phase, round, seed, start: 0, stopAngle: 0, flashAt: 0 })
  live.current.phase = phase
  live.current.round = round
  live.current.seed = seed
  const r = roundFor(seed, round)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches
    const read = () => {
      const s = getComputedStyle(c)
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f
      colors.current = { fill: v('--game', '#9cf'), edge: v('--edge', '#000'), ink: v('--ink', '#000'), muted: v('--ink-muted', '#666'), surface: v('--surface', '#fff'), sunken: v('--surface-sunken', '#eee'), good: v('--success', '#096'), bad: v('--danger', '#c00') }
    }
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      size.current = { dpr }
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

  useEffect(() => {
    if (phase === 'done') return
    let raf = 0
    const frame = () => { draw(); raf = requestAnimationFrame(frame) }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function draw() {
    const c = canvas.current, col = colors.current
    if (!c || !col) return
    const g = c.getContext('2d')!
    const { dpr } = size.current
    const L = live.current
    const rd = roundFor(L.seed, L.round)
    const W = c.width, H = c.height
    const px = W / 2, py = H * 0.1, len = Math.min(H * 0.68, (W / 2 - 34 * dpr) / Math.sin((AMPLITUDE * Math.PI) / 180))
    const angle = L.phase === 'swing' ? angleAt(performance.now() - L.start, rd.period) : L.phase === 'ready' ? -AMPLITUDE : L.stopAngle
    const toXY = (deg: number, rr = len) => [px + Math.sin((deg * Math.PI) / 180) * rr, py + Math.cos((deg * Math.PI) / 180) * rr]
    const arcAt = (a: number) => Math.PI / 2 - (a * Math.PI) / 180
    g.clearRect(0, 0, W, H)
    // The track of the swing.
    g.lineCap = 'round'
    g.strokeStyle = col.sunken; g.lineWidth = 16 * dpr
    g.beginPath(); g.arc(px, py, len, arcAt(AMPLITUDE), arcAt(-AMPLITUDE)); g.stroke()
    // The target zone.
    const flash = L.phase === 'hit' && !reduced.current ? 1 + 0.25 * Math.sin((performance.now() - L.flashAt) / 40) : 1
    g.strokeStyle = col.edge; g.lineWidth = 26 * dpr * flash
    g.beginPath(); g.arc(px, py, len, arcAt(rd.center + rd.width / 2), arcAt(rd.center - rd.width / 2)); g.stroke()
    g.strokeStyle = L.phase === 'hit' ? col.good : col.fill; g.lineWidth = 20 * dpr * flash
    g.beginPath(); g.arc(px, py, len, arcAt(rd.center + rd.width / 2), arcAt(rd.center - rd.width / 2)); g.stroke()
    // The rod and bob.
    const [bx, by] = toXY(angle)
    g.strokeStyle = col.ink; g.lineWidth = 4 * dpr
    g.beginPath(); g.moveTo(px, py); g.lineTo(bx, by); g.stroke()
    g.fillStyle = col.ink; g.beginPath(); g.arc(px, py, 6 * dpr, 0, Math.PI * 2); g.fill()
    g.fillStyle = L.phase === 'miss' ? col.bad : col.surface; g.strokeStyle = col.edge; g.lineWidth = 3 * dpr
    g.beginPath(); g.arc(bx, by, 17 * dpr, 0, Math.PI * 2); g.fill(); g.stroke()
    // Round count, or the prompt.
    g.textAlign = 'center'; g.textBaseline = 'top'
    if (L.phase === 'ready') {
      g.fillStyle = col.muted; g.font = `700 ${Math.round(15 * dpr)}px Figtree, system-ui, sans-serif`
      g.fillText('Tap to start · tap again to stop it in the zone', W / 2, H - 30 * dpr)
    } else {
      g.fillStyle = col.ink; g.font = `800 ${Math.round(34 * dpr)}px "Bricolage Grotesque", system-ui, sans-serif`
      g.fillText(String(L.round), W / 2, H - 52 * dpr)
      g.fillStyle = col.muted; g.font = `700 ${Math.round(12 * dpr)}px Figtree, system-ui, sans-serif`
      g.fillText('rounds cleared', W / 2, H - 18 * dpr)
    }
  }

  function press() {
    const L = live.current
    if (L.phase === 'ready') {
      L.start = performance.now()
      setPhase('swing')
      live.current.phase = 'swing'
      feel.tap()
      return
    }
    if (L.phase !== 'swing') return
    const rd = roundFor(L.seed, L.round)
    const a = angleAt(performance.now() - L.start, rd.period)
    L.stopAngle = a
    if (inZone(a, rd)) {
      L.flashAt = performance.now()
      setPhase('hit')
      live.current.phase = 'hit'
      feel.chime(L.round)
      feel.medium()
      setTimeout(() => {
        live.current.start = performance.now()
        setRound((k) => k + 1)
        setPhase('swing')
      }, BETWEEN)
    } else {
      setPhase('miss')
      live.current.phase = 'miss'
      feel.bad()
      recordPlay(game.slug, L.round, undefined, `${L.round} rounds`)
      setFresh(true)
      setTimeout(() => setPhase('done'), 1000)
    }
  }

  function again() {
    const next = challenge ? seed : newSeed()
    setSeed(next)
    setRound(0)
    setPhase('ready')
  }

  if (phase === 'done') {
    const best = getStats(game.slug).best
    return (
      <ResultCard
        game={game}
        headline={`${round} round${round === 1 ? '' : 's'}`}
        detail={best != null && best > round ? `Your best: ${best} rounds` : 'Stopped in the zone that many times in a row'}
        shareText={`🕰️ Pendulum Stop\nStopped it in the zone ${round} time${round === 1 ? '' : 's'} in a row`}
        finishData={{ score: round }}
        trackFinish={fresh}
        challenge={{ seed, score: round, text: `${round} rounds`, lowerIsBetter: false }}
        onReplay={again}
      />
    )
  }

  return (
    <Stage
      flush
      className="ps-stage"
      role="button"
      tabIndex={0}
      aria-label={phase === 'ready' ? 'Tap to start the pendulum' : 'Tap to stop the pendulum'}
      data-primary="pointer"
      data-round={JSON.stringify(r)}
      onPointerDown={(e) => { e.preventDefault(); press() }}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press() } }}
    >
      <canvas ref={canvas} className="ps-canvas" aria-hidden="true" />
      {phase === 'hit' && round >= 4 && round % 5 === 4 && <Burst y="80%" color={game.color} />}
    </Stage>
  )
}
