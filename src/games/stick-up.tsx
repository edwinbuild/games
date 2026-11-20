import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { EDGE, fallen, forceOf, G, gustsFor, LEN, startState, step, W, windAt, type State } from './stick-up/physics'
import { newSeed, readChallenge } from '../shell/challenge'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, recordPlay } from '../shell/stats'
import { Score } from '../ui/components'
import './stick-up.css'

const game = getGame('stick-up')
const H = 420
const GROUND = 400
const BALL = 22
const STEP = 1 / 240
/** Arrow keys move the ball this fast (stage units a second). */
const KEY_SPEED = 380
const STREAKS = 14
type Phase = 'ready' | 'up' | 'falling' | 'done'

const secs = (t: number) => `${t.toFixed(1)} s`

export default function StickUp() {
  // A challenge link plays its wind first; every other run gets new gusts.
  const challenge = readChallenge(game.slug)
  const [seed, setSeed] = useState(() => challenge?.s ?? newSeed())
  const [phase, setPhase] = useState<Phase>('ready')
  const [result, setResult] = useState<{ t: number; force: number } | null>(null)
  const [shown, setShown] = useState(0)
  const svg = useRef<SVGSVGElement>(null)
  const stick = useRef<SVGGElement>(null)
  const ball = useRef<SVGGElement>(null)
  const streaks = useRef<(SVGLineElement | null)[]>([])
  const gustLabel = useRef<HTMLSpanElement>(null)
  // Everything the frame loop needs lives in one ref, so a frame never waits for React.
  const live = useRef({ phase: 'ready' as Phase, s: startState(0), target: W / 2, keys: 0, run: gustsFor(seed), last: 0, fallT: 0, streakX: Array.from({ length: STREAKS }, (_, i) => (i * 61) % W) })

  function reset(nextSeed: string) {
    const run = gustsFor(nextSeed)
    Object.assign(live.current, { phase: 'ready', s: startState(0), target: W / 2, keys: 0, run, fallT: 0 })
    setSeed(nextSeed)
    setResult(null)
    setShown(0)
    setPhase('ready')
  }

  function start() {
    const L = live.current
    if (L.phase !== 'ready') return
    L.s = startState(L.run.lean)
    L.phase = 'up'
    L.last = performance.now()
    setPhase('up')
    feel.light()
  }

  // The frame loop: physics in small fixed steps, then the drawing.
  useEffect(() => {
    let raf = 0
    let tick = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const L = live.current
      const dt = Math.min(0.05, (now - (L.last || now)) / 1000)
      L.last = now
      let wind = 0
      if (L.phase === 'up') {
        L.target = Math.max(EDGE, Math.min(W - EDGE, L.target + L.keys * KEY_SPEED * dt))
        for (let t = 0; t < dt; t += STEP) {
          wind = windAt(L.run.gusts, L.s.t)
          L.s = step(L.s, L.target, wind, STEP)
          if (fallen(L.s)) { fall(); break }
        }
        if (++tick % 6 === 0) setShown(L.s.t)
      } else if (L.phase === 'falling') {
        // Finish the fall to the ground, then the result.
        L.fallT += dt
        const s = L.s
        s.om += Math.sign(s.th) * 9 * dt
        s.th = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, s.th + s.om * dt))
        if (L.fallT > 0.7) { L.phase = 'done'; setPhase('done') }
      }
      draw(L.s, L.phase === 'up' ? windAt(L.run.gusts, L.s.t) : wind, dt)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [seed]) // eslint-disable-line react-hooks/exhaustive-deps

  function fall() {
    const L = live.current
    L.phase = 'falling'
    L.fallT = 0
    const t = Math.round(L.s.t * 10) / 10
    const force = forceOf(L.run.gusts, L.s.t)
    recordPlay(game.slug, t, undefined, secs(t))
    setResult({ t, force })
    setShown(t)
    setPhase('falling')
    feel.thud()
  }

  function draw(s: State, wind: number, dt: number) {
    const L = live.current
    const bx = s.x
    ball.current?.setAttribute('transform', `translate(${bx} ${GROUND - BALL}) rotate(${(bx / BALL) * 57.3})`)
    stick.current?.setAttribute('transform', `translate(${bx} ${GROUND - 2 * BALL + 4}) rotate(${(s.th * 180) / Math.PI})`)
    // Wind streaks drift with the wind; stronger wind, faster and darker.
    const strength = Math.min(1, Math.abs(wind) / (G * 0.6))
    streaks.current.forEach((el, i) => {
      if (!el) return
      L.streakX[i] = (L.streakX[i] + wind * dt * (0.6 + (i % 3) * 0.25) + W + 80) % (W + 80)
      const x = L.streakX[i] - 40, y = 40 + ((i * 47) % 300), len = 12 + strength * 34
      el.setAttribute('x1', String(x)); el.setAttribute('x2', String(x - Math.sign(wind || 1) * len))
      el.setAttribute('y1', String(y)); el.setAttribute('y2', String(y))
      el.style.opacity = String(0.08 + strength * 0.6)
    })
    if (gustLabel.current) {
      const f = Math.round((Math.abs(wind) / G) * 12)
      gustLabel.current.textContent = L.phase !== 'up' || f < 2 ? 'Calm' : `${wind > 0 ? 'Wind →' : '← Wind'} ${'▮'.repeat(Math.min(9, f))}`
    }
    svg.current?.setAttribute('data-theta', s.th.toFixed(3))
    svg.current?.setAttribute('data-x', s.x.toFixed(1))
  }

  // Pointer: the ball follows the finger (while touching) or the mouse (while over the stage).
  const toStage = (e: { clientX: number }) => {
    const r = svg.current!.getBoundingClientRect()
    return ((e.clientX - r.left) / r.width) * W
  }
  function onDown(e: React.PointerEvent) {
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    live.current.target = live.current.phase === 'ready' ? W / 2 : toStage(e)
    start()
  }
  function onMove(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' && e.buttons === 0) return
    if (live.current.phase === 'up') live.current.target = toStage(e)
  }
  // Keyboard: hold the arrows to move; Space or Enter starts.
  useEffect(() => {
    if (phase === 'done') return
    const held = new Set<string>()
    const update = () => { live.current.keys = (held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0) }
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea')) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); held.add(e.key); update(); start() }
      else if ((e.key === ' ' || e.key === 'Enter') && live.current.phase === 'ready') { e.preventDefault(); start() }
    }
    const up = (e: KeyboardEvent) => { held.delete(e.key); update() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done' && result) {
    const best = getStats(game.slug).best ?? result.t
    return (
      <ResultCard
        game={game}
        headline={`Up for ${secs(result.t)}`}
        detail={`${result.t >= best ? 'Your best run' : `Your best: ${secs(best)}`} · wind up to force ${result.force}`}
        shareText={`🥢 Stick Up\nKept the stick up for ${secs(result.t)}\nWind up to force ${result.force}`}
        finishData={{ score: result.t, force: result.force }}
        challenge={{ seed, score: result.t, text: secs(result.t), lowerIsBetter: false }}
        onReplay={() => reset(newSeed())}
      />
    )
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <Score label="Seconds" value={shown.toFixed(1)} size="md" />
        <span className="small muted su-wind" ref={gustLabel} aria-live="off">Calm</span>
      </div>
      <div
        className="qg-stage su-stage"
        role="application"
        tabIndex={0}
        aria-label="A stick standing on a ball. Move the ball left and right under the stick to keep it from falling: drag, move the mouse, or hold the arrow keys. Wind gusts push the stick."
        data-primary="pointer"
        onPointerDown={onDown}
        onPointerMove={onMove}
      >
        <svg ref={svg} className="su-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" data-phase={phase}>
          {Array.from({ length: STREAKS }, (_, i) => <line key={i} ref={(el) => { streaks.current[i] = el }} className="su-streak" />)}
          <line className="su-ground" x1="0" x2={W} y1={GROUND} y2={GROUND} />
          <g ref={stick} transform={`translate(${W / 2} ${GROUND - 2 * BALL + 4})`}>
            <line className="su-stick-edge" x1="0" y1="0" x2="0" y2={-LEN} />
            <line className="su-stick" x1="0" y1="0" x2="0" y2={-LEN} />
            <circle className="su-tip" cx="0" cy={-LEN} r="7" />
          </g>
          <g ref={ball} transform={`translate(${W / 2} ${GROUND - BALL})`}>
            <circle className="su-ball" r={BALL} />
            <path className="su-ball-mark" d={`M ${-BALL * 0.55} 0 A ${BALL * 0.55} ${BALL * 0.55} 0 0 1 ${BALL * 0.55} 0`} />
          </g>
        </svg>
        {phase === 'ready' && <span className="su-start">Touch the ball to start<br /><span className="small muted">or press Space · arrows move</span></span>}
      </div>
      <p className="small muted center" style={{ margin: 'var(--space-2) 0 0' }}>Move the ball under the stick the way it leans. When the wind blows, lean the stick into it. Gusts get stronger the longer you last.</p>
    </>
  )
}
