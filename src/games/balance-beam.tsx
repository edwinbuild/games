import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { MASSES, PEGS, puzzleFor, tiltFor, torque, type Weight } from './balance-beam/beam'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Stage } from '../ui'

const game = getGame('balance-beam')
/** A finished try: the weights you placed (fewer is better). */
type Try = Weight[]
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
// Drawing: the beam is 300 wide on a 320 × 210 board, pivot in the middle.
const PX = 160, PY = 150, GAP = 28
const xOf = (pos: number) => PX + pos * GAP
const pegName = (pos: number) => `${Math.abs(pos)} ${pos < 0 ? 'left' : 'right'}`

export default function BalanceBeam() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const { fixed, par } = useMemo(() => puzzleFor(seed), [seed])
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday(game.slug, [] as Try[])))
  // The weights you've placed survive a refresh.
  const [mine, setMine] = useRunState<Weight[]>(`${game.slug}:${seed}:${oneOff ? 'once' : tries.length}`, [])
  const [done, setDone] = useState(tries.length > 0 && mine.length === 0)
  const [fresh, setFresh] = useState(false)
  const [mass, setMass] = useState(1)
  const [cursor, setCursor] = useState(1)
  const t = torque([...fixed, ...mine])
  const level = t === 0 && mine.length > 0
  const wasLevel = useRef(level)

  // A little fanfare the moment it balances.
  useEffect(() => {
    if (level && !wasLevel.current) { feel.chime(5); feel.success() }
    wasLevel.current = level
  }, [level])

  function tapPeg(pos: number) {
    if (done) return
    setCursor(pos)
    if (fixed.some((w) => w.pos === pos)) { feel.bad(); return }
    const had = mine.find((w) => w.pos === pos)
    if (had && had.mass === mass) {
      setMine(mine.filter((w) => w.pos !== pos))
      feel.tap()
    } else {
      setMine([...mine.filter((w) => w.pos !== pos), { pos, mass }])
      feel.click()
      feel.medium()
    }
  }

  function lockIn() {
    if (!level) return
    const all = [...tries, mine]
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = Math.min(...all.map((x) => x.length))
      recordDaily(game.slug, best, new Date(), count(best, 'weight'), true)
    }
    setTries(all)
    setFresh(true)
    setDone(true)
  }
  function again() {
    setMine([])
    setDone(false)
  }

  // Keyboard: arrows pick a peg, 1–3 place that weight there, Backspace takes yours off.
  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest('input, textarea, button')) return
      const i = PEGS.indexOf(cursor)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        setCursor(PEGS[Math.max(0, Math.min(PEGS.length - 1, i + (e.key === 'ArrowLeft' ? -1 : 1)))])
      } else if (['1', '2', '3'].includes(e.key)) {
        e.preventDefault()
        const m = Number(e.key)
        setMass(m)
        if (!fixed.some((w) => w.pos === cursor)) { setMine([...mine.filter((w) => w.pos !== cursor), { pos: cursor, mass: m }]); feel.click() }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        if (mine.some((w) => w.pos === cursor)) { setMine(mine.filter((w) => w.pos !== cursor)); feel.tap() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done && tries.length) {
    const best = tries.reduce((a, b) => (b.length < a.length ? b : a))
    const n = count(tries.length, 'try', 'tries')
    const stats = getStats(game.slug)
    return (
      <>
        <Stage flush className="bb-stage"><Beam fixed={fixed} mine={best} settle={false} /></Stage>
        <ResultCard
          game={game}
          headline={`Balanced with ${count(best.length, 'weight')}`}
          detail={<>Par {par}{best.length <= par ? ' · on par' : ''} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`⚖️ Balance Beam ${puzzleLabel(day)}\nBalanced with ${count(best.length, 'weight')} (par ${par})\nBest of ${n}`}
          finishData={{ weights: best.length, par, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best.length, text: count(best.length, 'weight'), lowerIsBetter: true }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">Par {par} · {tries.length ? `try ${tries.length + 1}` : 'fewest weights wins'}</span>
        <span className="small muted" aria-live="polite">{count(mine.length, 'weight')} placed</span>
      </div>
      <Stage flush className="bb-stage" style={{ position: 'relative' }}>
        <Beam fixed={fixed} mine={mine} settle onPeg={tapPeg} cursor={cursor} />
        {level && <Burst y="30%" color={game.color} />}
      </Stage>
      <p className="body-strong center bb-state" aria-live="polite">
        {level ? `Level! ${count(mine.length, 'weight')}${mine.length <= par ? ' · on par' : ` · par is ${par}`}` : t > 0 ? 'The right side is heavier' : t < 0 ? 'The left side is heavier' : 'Place a weight to begin'}
      </p>
      <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
        <div className="bb-tray" role="radiogroup" aria-label="Weight to place">
          {MASSES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mass === m} className="bb-pick" onClick={() => { setMass(m); feel.tap() }}>
              <span className="bb-pick-box" style={{ width: 18 + m * 7, height: 12 + m * 7 }}>{m}</span>
              <kbd className="qg-kbd" aria-hidden="true">{m}</kbd>
            </button>
          ))}
        </div>
        <Button size="lg" block color={game.color} onClick={lockIn} disabled={!level} data-primary="click" hint="Enter">
          {level ? `Lock in ${count(mine.length, 'weight')}` : 'Balance the beam to lock in'}
        </Button>
        <p className="small muted center" style={{ margin: 0 }}>Tap a peg to put the chosen weight there; tap it again to take it off. A weight turns the beam by its size times its distance from the middle.</p>
      </div>
    </>
  )
}

/** The seesaw, drawn in SVG. With `settle`, it tips towards its resting tilt on a spring and wobbles to rest. */
function Beam({ fixed, mine, settle, onPeg, cursor }: { fixed: Weight[]; mine: Weight[]; settle: boolean; onPeg?: (pos: number) => void; cursor?: number }) {
  const beam = useRef<SVGGElement>(null)
  const target = tiltFor(torque([...fixed, ...mine]))
  const state = useRef({ a: settle ? target : 0, v: 0 })

  useEffect(() => {
    const g = beam.current
    if (!g) return
    if (!settle || reduced()) { state.current = { a: settle ? target : 0, v: 0 }; g.setAttribute('transform', `rotate(${state.current.a} ${PX} ${PY})`); return }
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const s = state.current
      // A damped spring: quick to tip, a couple of wobbles, then still.
      s.v += (70 * (target - s.a) - 6.5 * s.v) * dt
      s.a += s.v * dt
      g.setAttribute('transform', `rotate(${s.a.toFixed(3)} ${PX} ${PY})`)
      g.parentElement?.setAttribute('data-tilt', String(Math.round(s.a * 10) / 10))
      if (Math.abs(target - s.a) > 0.01 || Math.abs(s.v) > 0.01) raf = requestAnimationFrame(frame)
      else { s.a = target; s.v = 0; g.setAttribute('transform', `rotate(${target} ${PX} ${PY})`); g.parentElement?.setAttribute('data-tilt', String(target)) }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [target, settle])

  const box = (w: Weight, kind: 'fixed' | 'mine') => {
    const wd = 16 + w.mass * 6, ht = 12 + w.mass * 7
    return (
      <g key={`${kind}${w.pos}`} className={`bb-weight bb-weight--${kind}`}>
        <rect x={xOf(w.pos) - wd / 2} y={PY - 6 - ht} width={wd} height={ht} rx={3} />
        <text x={xOf(w.pos)} y={PY - 6 - ht / 2 + 4.5} textAnchor="middle">{w.mass}</text>
      </g>
    )
  }

  return (
    <svg className="bb-svg" viewBox="0 0 320 210" role="img" aria-label={`A seesaw. Fixed weights: ${fixed.map((w) => `${w.mass} at ${pegName(w.pos)}`).join(', ')}. Yours: ${mine.length ? mine.map((w) => `${w.mass} at ${pegName(w.pos)}`).join(', ') : 'none'}.`} data-tilt={settle ? undefined : 0}>
      <path className="bb-pivot" d={`M${PX} ${PY + 2} L${PX - 22} ${PY + 44} L${PX + 22} ${PY + 44} Z`} />
      <line className="bb-ground" x1={20} x2={300} y1={PY + 45} y2={PY + 45} />
      <g ref={beam} transform={`rotate(${settle ? state.current.a : 0} ${PX} ${PY})`}>
        <rect className="bb-bar" x={PX - 150} y={PY - 6} width={300} height={12} rx={6} />
        {PEGS.map((p) => <circle key={p} className="bb-peg" cx={xOf(p)} cy={PY} r={2.4} />)}
        <circle className="bb-hub" cx={PX} cy={PY} r={5} />
        {fixed.map((w) => box(w, 'fixed'))}
        {mine.map((w) => box(w, 'mine'))}
        {onPeg && PEGS.map((p) => {
          const f = fixed.find((w) => w.pos === p), m = mine.find((w) => w.pos === p)
          return (
            <rect
              key={`hit${p}`}
              className={`bb-hit${cursor === p ? ' is-cursor' : ''}`}
              x={xOf(p) - GAP / 2} y={PY - 80} width={GAP} height={96}
              role="button" tabIndex={0}
              aria-label={`Peg ${pegName(p)}: ${f ? `fixed weight ${f.mass}` : m ? `your weight ${m.mass}` : 'empty'}`}
              onClick={() => onPeg(p)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPeg(p) } }}
            />
          )
        })}
      </g>
    </svg>
  )
}
