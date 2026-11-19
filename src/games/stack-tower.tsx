import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { dayFor, drop, H, slide, speedFor, W, type Block } from './stack-tower/tower'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { count } from '../shell/plural'
import { Stage } from '../ui'

const game = getGame('stack-tower')
type Try = { h: number; perfect: number }
type Falling = Block & { y: number; vy: number; rot: number }
type Colors = { block: string; edge: string; ink: string; muted: string; flash: string }

/** Everything the animation loop touches lives here, outside React, so a frame does no rendering work. */
type World = {
  tower: Block[]
  moving: Block
  fromRight: boolean
  t0: number
  falling: Falling[]
  perfect: number
  streak: number
  flashAt: number
  camera: number
  over: boolean
}

export default function StackTower() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const params = dayFor(seed)
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday(game.slug, [] as Try[])))
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>(tries.length ? 'done' : 'ready')
  const [fresh, setFresh] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const world = useRef<World | null>(null)
  const size = useRef({ w: 300, h: 420, dpr: 1 })
  const colors = useRef<Colors | null>(null)

  function newWorld(): World {
    const base = { x: (W - params.startWidth) / 2, w: params.startWidth }
    return { tower: [base], moving: { x: 0, w: base.w }, fromRight: false, t0: performance.now(), falling: [], perfect: 0, streak: 0, flashAt: -1e9, camera: 0, over: false }
  }
  if (!world.current) world.current = newWorld()

  // Canvas size at device pixel ratio; theme colours read from CSS once and on theme change.
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const readColors = () => {
      const s = getComputedStyle(c)
      colors.current = { block: s.getPropertyValue('--game').trim() || '#f66', edge: s.getPropertyValue('--edge').trim() || '#000', ink: s.getPropertyValue('--ink').trim() || '#000', muted: s.getPropertyValue('--ink-muted').trim() || '#666', flash: s.getPropertyValue('--surface').trim() || '#fff' }
    }
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const { width, height } = e.contentRect
      size.current = { w: width, h: height, dpr }
      c.width = Math.round(width * dpr)
      c.height = Math.round(height * dpr)
      readColors()
    })
    ro.observe(c)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', readColors)
    const mo = new MutationObserver(readColors)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { ro.disconnect(); mq.removeEventListener('change', readColors); mo.disconnect() }
  }, [phase])

  // The animation loop.
  useEffect(() => {
    if (phase === 'done') return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const wd = world.current!
      const stacked = wd.tower.length - 1
      if (phase === 'play' && !wd.over) wd.moving.x = slide(wd.moving.w, speedFor(params, stacked), (now - wd.t0) / 1000, wd.fromRight)
      for (const f of wd.falling) { f.vy += 1400 * dt; f.y += f.vy * dt; f.rot += dt * (f.x < W / 2 ? -2 : 2) }
      wd.falling = wd.falling.filter((f) => f.y < 2000)
      draw(now)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function draw(now: number) {
    const c = canvas.current, col = colors.current
    if (!c || !col) return
    const g = c.getContext('2d')!
    const { w: cw, h: ch, dpr } = size.current
    const k = (cw / W) * dpr // world units → canvas pixels
    const bh = H * k
    const wd = world.current!
    // Keep the moving block about a third of the way down.
    const rows = ch * dpr / bh
    const target = Math.max(0, wd.tower.length + 1 - rows * 0.66)
    wd.camera += (target - wd.camera) * 0.12
    const yOf = (row: number) => c.height - (row - wd.camera + 1) * bh
    g.clearRect(0, 0, c.width, c.height)
    const box = (b: Block, y: number, fillStyle: string) => {
      g.fillStyle = fillStyle
      g.strokeStyle = col.edge
      g.lineWidth = Math.max(1, 2 * dpr)
      g.fillRect(b.x * k, y, b.w * k, bh)
      g.strokeRect(b.x * k + g.lineWidth / 2, y + g.lineWidth / 2, b.w * k - g.lineWidth, bh - g.lineWidth)
    }
    wd.tower.forEach((b, i) => {
      const y = yOf(i)
      if (y > c.height || y < -bh) return
      const flashing = i === wd.tower.length - 1 && now - wd.flashAt < 220
      box(b, y, flashing ? col.flash : col.block)
    })
    if (!wd.over) box(wd.moving, yOf(wd.tower.length), col.block)
    for (const f of wd.falling) {
      g.save()
      g.translate((f.x + f.w / 2) * k, f.y * dpr + bh / 2)
      g.rotate(f.rot)
      g.globalAlpha = 0.85
      box({ x: -f.w / 2, w: f.w }, -bh / 2, col.block)
      g.restore()
    }
    // Height, drawn on the canvas so the page does no layout while playing.
    g.fillStyle = col.ink
    g.font = `800 ${Math.round(44 * dpr)}px "Bricolage Grotesque", system-ui, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'top'
    g.fillText(String(wd.tower.length - 1), c.width / 2, 16 * dpr)
    if (phase === 'ready') {
      g.font = `700 ${Math.round(15 * dpr)}px Figtree, system-ui, sans-serif`
      g.fillStyle = col.muted
      g.fillText('Tap to start, then tap to drop', c.width / 2, 68 * dpr)
    }
  }

  function press() {
    const wd = world.current!
    if (phase === 'done' || wd.over) return
    if (phase === 'ready') {
      wd.t0 = performance.now()
      setPhase('play')
      feel.tap()
      return
    }
    const below = wd.tower[wd.tower.length - 1]
    const res = drop(wd.moving, below)
    const row = wd.tower.length
    if (res.kind === 'miss') {
      wd.over = true
      wd.falling.push({ ...wd.moving, y: screenY(row), vy: 0, rot: 0 })
      feel.bad()
      finish(wd.tower.length - 1, wd.perfect)
      return
    }
    wd.tower.push(res.placed)
    if (res.kind === 'perfect') {
      wd.perfect++
      wd.streak++
      wd.flashAt = performance.now()
      feel.chime(wd.streak - 1)
      feel.medium()
    } else {
      wd.streak = 0
      wd.falling.push({ ...res.cut, y: screenY(row), vy: 0, rot: 0 })
      feel.tap()
    }
    wd.fromRight = !wd.fromRight
    wd.moving = { x: wd.fromRight ? W - res.placed.w : 0, w: res.placed.w }
    wd.t0 = performance.now()
  }
  // Falling pieces live in CSS pixels from the canvas top.
  function screenY(row: number) {
    const { w: cw, h: ch } = size.current
    const bh = H * (cw / W)
    return ch - (row - world.current!.camera + 1) * bh
  }

  function finish(h: number, perfect: number) {
    const all = [...tries, { h, perfect }]
    setTries(all)
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = all.reduce((a, b) => (b.h > a.h ? b : a))
      recordDaily(game.slug, best.h, new Date(), `${count(best.h, 'block')}`)
    }
    setFresh(true)
    setTimeout(() => setPhase('done'), 1100)
  }

  function again() {
    world.current = newWorld()
    setPhase('ready')
  }

  if (phase === 'done' && tries.length) {
    const best = tries.reduce((a, b) => (b.h > a.h || (b.h === a.h && b.perfect > a.perfect) ? b : a))
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const lastTry = tries[tries.length - 1]
    const stats = getStats(game.slug)
    const blocks = (h: number) => `${h} block${h === 1 ? '' : 's'}`
    return (
      <>
        {fresh && (
          <Stage>
            <p className="body-strong center" style={{ margin: 0 }}>Last try: {blocks(lastTry.h)}, {lastTry.perfect} perfect</p>
          </Stage>
        )}
        <ResultCard
          game={game}
          headline={`${blocks(best.h)} high`}
          detail={<>{best.perfect} perfect drop{best.perfect === 1 ? '' : 's'} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🧱 Stack Tower ${puzzleLabel(day)}\n${blocks(best.h)} · ${best.perfect} perfect\nBest of ${n}`}
          finishData={{ score: best.h, perfect: best.perfect, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best.h, text: blocks(best.h), lowerIsBetter: false }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <Stage
      flush
      className="st-stage"
      role="button"
      tabIndex={0}
      aria-label={phase === 'ready' ? 'Tap to start' : 'Tap to drop the block'}
      data-primary="pointer"
      onPointerDown={(e) => { e.preventDefault(); press() }}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press() } }}
    >
      <canvas ref={canvas} className="st-canvas" aria-hidden="true" />
      {phase === 'ready' && <kbd className="qg-kbd st-kbd" aria-hidden="true">Space</kbd>}
    </Stage>
  )
}
