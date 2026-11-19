import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { onOrbit, planetsFor, release, SPEED, WORLD_W, type Planet, type V } from './orbit-drop/orbit'
import { newSeed, readChallenge } from '../shell/challenge'
import { feel } from '../shell/feel'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { getStats, recordPlay } from '../shell/stats'
import { Score } from '../ui'

const game = getGame('orbit-drop')
/** World height shown on screen (the canvas is WORLD_W wide). */
const VIEW_H = 440
type Phase = 'orbit' | 'fly' | 'lost' | 'done'
type Colors = { fill: string; edge: string; ink: string; muted: string; surface: string; sunken: string; line: string }

export default function OrbitDrop() {
  // A challenge link plays its run first; every other game gets a new seed.
  const challenge = readChallenge(game.slug)
  const [seed, setSeed] = useState(() => challenge?.s ?? newSeed())
  const [phase, setPhase] = useState<Phase>('orbit')
  const [caught, setCaught] = useState(0)
  const [started, setStarted] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const colors = useRef<Colors | null>(null)
  const planets = useRef<Planet[]>(planetsFor(seed, 80))
  // Everything the animation loop needs lives in one ref, so a frame never waits for React.
  const live = useRef({
    phase: 'orbit' as Phase, i: 0, angle: Math.PI / 2, ball: { x: 0, y: 0 } as V, dir: { x: 0, y: 0 } as V,
    flyT: 0, flyFor: 0, hitAngle: 0, camY: 0, trail: [] as V[], flash: 0, last: performance.now(), lostAt: 0,
  })

  function reset(nextSeed: string) {
    planets.current = planetsFor(nextSeed, 80)
    Object.assign(live.current, { phase: 'orbit', i: 0, angle: Math.PI / 2, trail: [], flash: 0, camY: 0, last: performance.now() })
    setSeed(nextSeed)
    setCaught(0)
    setStarted(false)
    setPhase('orbit')
  }

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const read = () => {
      const s = getComputedStyle(c)
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f
      colors.current = { fill: v('--game', '#cab'), edge: v('--edge', '#000'), ink: v('--ink', '#000'), muted: v('--ink-muted', '#666'), surface: v('--surface', '#fff'), sunken: v('--surface-sunken', '#eee'), line: v('--line', '#ccc') }
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

  // The loop: moves the ball, the camera and the trail, and draws.
  useEffect(() => {
    if (phase === 'done') return
    let raf = 0
    const L = live.current
    L.last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - L.last) / 1000)
      L.last = now
      const ps = planets.current
      const cur = ps[L.i]
      if (L.phase === 'orbit') {
        L.angle += cur.dir * cur.w * dt
        const o = onOrbit(cur, L.angle)
        L.ball = o.pos
        L.dir = o.dir
        // For tests (and nothing on screen): whether letting go now would be caught.
        const next = ps[L.i + 1]
        if (next) stage.current?.setAttribute('data-aim', release(cur, next, L.angle).hit ? 'hit' : 'miss')
      } else if (L.phase === 'fly' || L.phase === 'lost') {
        L.flyT += dt
        L.ball = { x: L.ball.x + L.dir.x * SPEED * dt, y: L.ball.y + L.dir.y * SPEED * dt }
        if (L.phase === 'fly' && L.flyT >= L.flyFor) catchBall()
        if (L.phase === 'lost' && now - L.lostAt > 1100) { L.phase = 'done'; finish() }
      }
      L.trail.push({ ...L.ball })
      if (L.trail.length > 18) L.trail.shift()
      // The camera keeps the current planet low on screen, so the next one shows above it.
      const want = ps[L.i].y - VIEW_H * 0.22
      L.camY += (want - L.camY) * Math.min(1, dt * 4)
      L.flash = Math.max(0, L.flash - dt * 2.2)
      draw()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase === 'done']) // eslint-disable-line react-hooks/exhaustive-deps

  function letGo() {
    const L = live.current
    if (L.phase !== 'orbit') return
    setStarted(true)
    const ps = planets.current
    if (L.i + 2 >= ps.length) planets.current = planetsFor(seed, ps.length + 80)
    const f = release(ps[L.i], planets.current[L.i + 1], L.angle)
    L.flyT = 0
    stage.current?.setAttribute('data-aim', 'flying') // until the next orbit says otherwise
    feel.tap()
    if (f.hit) {
      L.phase = 'fly'
      L.flyFor = f.t
      L.hitAngle = f.angle
      setPhase('fly')
    } else {
      L.phase = 'lost'
      L.lostAt = performance.now()
      setPhase('lost')
      setTimeout(() => feel.bad(), 350)
    }
  }

  function catchBall() {
    const L = live.current
    L.i += 1
    L.angle = L.hitAngle
    L.phase = 'orbit'
    L.flash = 1
    const n = L.i
    setCaught(n)
    setPhase('orbit')
    feel.chime(Math.min(n, 14))
    feel.light()
  }

  function finish() {
    const n = live.current.i
    recordPlay(game.slug, n, undefined, count(n, 'planet'))
    setPhase('done')
  }

  function draw() {
    const c = canvas.current, col = colors.current
    if (!c || !col) return
    const g = c.getContext('2d')!
    const L = live.current
    const k = c.width / WORLD_W
    const X = (x: number) => (x + WORLD_W / 2) * k
    const Y = (y: number) => (y - L.camY + VIEW_H / 2) * k
    g.clearRect(0, 0, c.width, c.height)
    // Stars: fixed in a slower layer, so they drift as the camera climbs.
    g.fillStyle = col.line
    const off = L.camY * 0.35
    for (let s = 0; s < 60; s++) {
      const sx = ((s * 97) % WORLD_W)
      const sy = (((s * 157 + 31) % 900) - off % 900 + 900) % 900 - 230
      const size = (s % 3) + 1
      g.fillRect(X(sx - WORLD_W / 2), sy * k, size * k * 0.6, size * k * 0.6)
    }
    const ps = planets.current
    const from = Math.max(0, L.i - 1), to = Math.min(ps.length - 1, L.i + 2)
    for (let i = from; i <= to; i++) {
      const p = ps[i]
      const next = i === L.i + 1
      // Orbit ring: dashed for where you are and where you're going.
      if (i === L.i || next) {
        g.setLineDash([5 * k, 6 * k])
        g.strokeStyle = next ? col.ink : col.muted
        g.lineWidth = 1.5 * k
        g.beginPath(); g.arc(X(p.x), Y(p.y), p.orbit * k, 0, Math.PI * 2); g.stroke()
        g.setLineDash([])
      }
      g.fillStyle = i <= L.i ? col.sunken : col.fill
      g.strokeStyle = col.edge
      g.lineWidth = 2.5 * k
      g.beginPath(); g.arc(X(p.x), Y(p.y), p.r * k, 0, Math.PI * 2); g.fill(); g.stroke()
      // A little crater for character.
      g.fillStyle = 'rgba(0,0,0,0.12)'
      g.beginPath(); g.arc(X(p.x - p.r * 0.3), Y(p.y - p.r * 0.25), p.r * 0.22 * k, 0, Math.PI * 2); g.fill()
    }
    // Catch flash: a ring bursting out of the planet just reached.
    if (L.flash > 0) {
      const p = ps[L.i]
      g.globalAlpha = L.flash
      g.strokeStyle = col.fill
      g.lineWidth = 4 * k * L.flash
      g.beginPath(); g.arc(X(p.x), Y(p.y), (p.orbit + (1 - L.flash) * 40) * k, 0, Math.PI * 2); g.stroke()
      g.globalAlpha = 1
    }
    // Trail, then the ball.
    for (let i = 1; i < L.trail.length; i++) {
      const a = L.trail[i - 1], b = L.trail[i]
      g.strokeStyle = col.ink
      g.globalAlpha = (i / L.trail.length) * 0.35
      g.lineWidth = 5 * k * (i / L.trail.length)
      g.lineCap = 'round'
      g.beginPath(); g.moveTo(X(a.x), Y(a.y)); g.lineTo(X(b.x), Y(b.y)); g.stroke()
    }
    g.globalAlpha = 1
    g.fillStyle = col.surface
    g.strokeStyle = col.edge
    g.lineWidth = 2.5 * k
    g.beginPath(); g.arc(X(L.ball.x), Y(L.ball.y), 7 * k, 0, Math.PI * 2); g.fill(); g.stroke()
  }

  if (phase === 'done') {
    const best = getStats(game.slug).best ?? caught
    return (
      <ResultCard
        game={game}
        headline={`${count(caught, 'planet')} reached`}
        detail={caught >= best && caught > 0 ? 'Your best run' : `Your best: ${count(best, 'planet')}`}
        shareText={`🪐 Orbit Drop\nReached ${count(caught, 'planet')}`}
        finishData={{ score: caught }}
        challenge={{ seed, score: caught, text: count(caught, 'planet'), lowerIsBetter: false }}
        onReplay={() => reset(newSeed())}
      />
    )
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <Score label="Planets" value={caught} size="md" bump />
        <span className="small muted">{phase === 'lost' ? 'Lost in space…' : started ? 'Let go when you’re aimed at the next one' : 'Tap to let go'}</span>
      </div>
      <div
        className="qg-stage od-stage"
        role="button"
        tabIndex={0}
        aria-label={`Let go of the ball. ${count(caught, 'planet')} reached so far.`}
        data-primary="pointer"
        data-planet={caught}
        ref={stage}
        onPointerDown={(e) => { e.preventDefault(); letGo() }}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); letGo() } }}
      >
        <canvas ref={canvas} className="od-canvas" aria-hidden="true" />
      </div>
      <p className="small muted center" style={{ margin: 'var(--space-2) 0 0' }}>The ball flies straight off in the direction it’s moving. Catch the next planet’s ring to keep going.</p>
    </>
  )
}
