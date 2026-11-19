import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { freeSlots, level, LOW_PEGS, MASSES, PEGS, puzzleFor, tiltFor, torques, trayLeft, type BeamId, type Weight } from './balance-beam/beam'
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
type Slot = { beam: BeamId; pos: number }
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
// Drawing: the top beam pivots at (PX, PY); the second beam hangs STRING below one of its pegs.
const PX = 160, GAP = 26, LGAP = 22, STRING = 74
const xOf = (pos: number) => PX + pos * GAP
const side = (pos: number) => `${Math.abs(pos)} ${pos < 0 ? 'left' : 'right'}`
const slotName = (s: Slot) => `${s.beam === 'low' ? 'Lower beam, peg' : 'Peg'} ${side(s.pos)}`
const same = (a: Slot, b: Slot) => a.beam === b.beam && a.pos === b.pos

export default function BalanceBeam() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const puzzle = useMemo(() => puzzleFor(seed), [seed])
  const { fixed, hangAt, par } = puzzle
  // Older saved days (one beam, weights without a beam) don't carry over.
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday<Try[]>(game.slug, []).filter((t) => Array.isArray(t) && t.every((x) => x && (x.beam === 'top' || x.beam === 'low')))))
  // The weights you've placed survive a refresh.
  const [mine, setMine] = useRunState<Weight[]>(`${game.slug}:v2:${seed}:${oneOff ? 'once' : tries.length}`, [])
  const [done, setDone] = useState(tries.length > 0 && mine.length === 0)
  const [fresh, setFresh] = useState(false)
  const [mass, setMass] = useState(1)
  const slots = useMemo(() => freeSlots(puzzle), [puzzle])
  const [cursor, setCursor] = useState<Slot>(slots[0])
  const all = [...fixed, ...mine]
  const t = torques(all, hangAt)
  const balanced = mine.length > 0 && level(all, hangAt)
  const left = trayLeft(mine)
  const wasLevel = useRef(balanced)

  // A little fanfare the moment it balances.
  useEffect(() => {
    if (balanced && !wasLevel.current) { feel.chime(5); feel.success() }
    wasLevel.current = balanced
  }, [balanced])

  function place(s: Slot, m: number) {
    if (done) return
    setCursor(s)
    if (fixed.some((w) => same(w, s)) || (s.beam === 'top' && s.pos === hangAt)) { feel.bad(); return }
    const had = mine.find((w) => same(w, s))
    if (had && had.mass === m) {
      setMine(mine.filter((w) => !same(w, s)))
      feel.tap()
      return
    }
    // Two of each size: swapping a weight frees its own size first.
    const freeOfSize = left[m - 1] + (had && had.mass === m ? 1 : 0)
    if (freeOfSize <= 0) { feel.bad(); return }
    setMine([...mine.filter((w) => !same(w, s)), { ...s, mass: m }])
    feel.click()
    feel.medium()
  }

  function lockIn() {
    if (!balanced) return
    const list = [...tries, mine]
    if (!oneOff) {
      saveToday(game.slug, list)
      const best = Math.min(...list.map((x) => x.length))
      recordDaily(game.slug, best, new Date(), count(best, 'weight'), true)
    }
    setTries(list)
    setFresh(true)
    setDone(true)
  }
  function again() {
    setMine([])
    setDone(false)
  }

  // Keyboard: arrows move between pegs (top beam, then the lower one), 1–5 place that weight, Backspace takes it off.
  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest('input, textarea, button')) return
      const i = Math.max(0, slots.findIndex((s) => same(s, cursor)))
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        setCursor(slots[Math.max(0, Math.min(slots.length - 1, i + (e.key === 'ArrowLeft' ? -1 : 1)))])
      } else if (/^[1-5]$/.test(e.key)) {
        e.preventDefault()
        setMass(Number(e.key))
        place(cursor, Number(e.key))
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        if (mine.some((w) => same(w, cursor))) { setMine(mine.filter((w) => !same(w, cursor))); feel.tap() }
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
        <Stage flush className="bb-stage"><Beams fixed={fixed} mine={best} hangAt={hangAt} settle={false} /></Stage>
        <ResultCard
          game={game}
          headline={`Balanced with ${count(best.length, 'weight')}`}
          detail={<>Par {par}{best.length <= par ? ' · on par' : ''}{hangAt != null ? ' · two beams' : ''} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`⚖️ Balance Beam ${puzzleLabel(day)}\nBalanced ${hangAt != null ? 'two beams ' : ''}with ${count(best.length, 'weight')} (par ${par})\nBest of ${n}`}
          finishData={{ weights: best.length, par, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best.length, text: count(best.length, 'weight'), lowerIsBetter: true }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  const heavier = (x: number) => (x > 0 ? 'right' : 'left')
  const state = balanced
    ? `Level! ${count(mine.length, 'weight')}${mine.length <= par ? ' · on par' : ` · par is ${par}`}`
    : t.low !== 0 && hangAt != null
      ? `The lower beam tips ${heavier(t.low)}`
      : t.top !== 0
        ? `The ${heavier(t.top)} side is heavier`
        : 'Place a weight to begin'
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">Par {par}{hangAt != null ? ' · two beams' : ''} · {tries.length ? `try ${tries.length + 1}` : 'fewest weights wins'}</span>
        <span className="small muted" aria-live="polite">{count(mine.length, 'weight')} placed</span>
      </div>
      <Stage flush className="bb-stage" style={{ position: 'relative' }}>
        <Beams fixed={fixed} mine={mine} hangAt={hangAt} settle onPeg={(s) => place(s, mass)} cursor={cursor} />
        {balanced && <Burst y="30%" color={game.color} />}
      </Stage>
      <p className="body-strong center bb-state" aria-live="polite">{state}</p>
      <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
        <div className="bb-tray" role="radiogroup" aria-label="Weight to place">
          {MASSES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mass === m} aria-label={`${m}, ${left[m - 1]} left`} className="bb-pick" disabled={left[m - 1] <= 0 && mass !== m} onClick={() => { setMass(m); feel.tap() }}>
              <span className="bb-pick-box" style={{ width: 14 + m * 5, height: 10 + m * 5 }}>{m}</span>
              <span className="bb-pick-left" aria-hidden="true">×{left[m - 1]}</span>
            </button>
          ))}
        </div>
        <Button size="lg" block color={game.color} onClick={lockIn} disabled={!balanced} data-primary="click" hint="Enter">
          {balanced ? `Lock in ${count(mine.length, 'weight')}` : hangAt != null ? 'Level both beams to lock in' : 'Balance the beam to lock in'}
        </Button>
        <p className="small muted center" style={{ margin: 0 }}>
          Tap a peg to put the chosen weight there; tap it again to take it off. A weight turns a beam by its size times its distance from the middle.{hangAt != null ? ' Everything on the lower beam also pulls on the top beam where it hangs.' : ''}
        </p>
      </div>
    </>
  )
}

/**
 * The seesaw (and on two-beam days the one hanging from it), in SVG. With `settle`, each beam tips
 * towards its resting tilt on a spring and wobbles to rest; the string follows the top beam's tilt.
 */
function Beams({ fixed, mine, hangAt, settle, onPeg, cursor }: { fixed: Weight[]; mine: Weight[]; hangAt: number | null; settle: boolean; onPeg?: (s: Slot) => void; cursor?: Slot }) {
  const two = hangAt != null
  const PY = two ? 92 : 150
  const H = two ? 250 : 210
  const top = useRef<SVGGElement>(null)
  const low = useRef<SVGGElement>(null)
  const string = useRef<SVGLineElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const t = torques([...fixed, ...mine], hangAt)
  const target = { top: tiltFor(t.top), low: tiltFor(t.low) }
  const state = useRef({ a: settle ? target.top : 0, va: 0, b: settle ? target.low : 0, vb: 0 })

  function apply() {
    const s = state.current
    top.current?.setAttribute('transform', `rotate(${s.a.toFixed(3)} ${PX} ${PY})`)
    if (two) {
      const rad = (s.a * Math.PI) / 180, dx = hangAt! * GAP
      const hx = PX + dx * Math.cos(rad), hy = PY + dx * Math.sin(rad)
      string.current?.setAttribute('x1', hx.toFixed(2)); string.current?.setAttribute('y1', hy.toFixed(2))
      string.current?.setAttribute('x2', hx.toFixed(2)); string.current?.setAttribute('y2', (hy + STRING).toFixed(2))
      low.current?.setAttribute('transform', `translate(${hx.toFixed(2)} ${(hy + STRING).toFixed(2)}) rotate(${s.b.toFixed(3)})`)
    }
    svg.current?.setAttribute('data-tilt', String(Math.round(Math.max(Math.abs(s.a), Math.abs(s.b)) * 100) / 100))
  }

  useEffect(() => {
    if (!settle || reduced()) { state.current = { a: settle ? target.top : 0, va: 0, b: settle ? target.low : 0, vb: 0 }; apply(); return }
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const s = state.current
      // Damped springs: quick to tip, a couple of wobbles, then still.
      s.va += (70 * (target.top - s.a) - 6.5 * s.va) * dt; s.a += s.va * dt
      s.vb += (60 * (target.low - s.b) - 6 * s.vb) * dt; s.b += s.vb * dt
      const moving = Math.abs(target.top - s.a) > 0.01 || Math.abs(s.va) > 0.01 || Math.abs(target.low - s.b) > 0.01 || Math.abs(s.vb) > 0.01
      if (!moving) Object.assign(s, { a: target.top, va: 0, b: target.low, vb: 0 })
      apply()
      if (moving) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [target.top, target.low, settle]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(apply) // keep the string and lower beam in place after React re-renders

  // Weights are as wide as a peg allows (so neighbours never overlap) and taller the heavier they are.
  const box = (w: Weight, kind: 'fixed' | 'mine', x: number, y: number) => {
    const lowBeam = w.beam === 'low'
    const wd = lowBeam ? LGAP - 2 : GAP - 3, ht = (lowBeam ? 7 : 9) + w.mass * (lowBeam ? 5 : 6)
    const base = lowBeam ? 4 : 5
    return (
      <g key={`${kind}${w.beam}${w.pos}`} className={`bb-weight bb-weight--${kind}${lowBeam ? ' bb-weight--small' : ''}`}>
        <rect x={x - wd / 2} y={y - base - ht} width={wd} height={ht} rx={3} />
        <text x={x} y={y - base - 5} textAnchor="middle">{w.mass}</text>
      </g>
    )
  }
  const hit = (s: Slot, x: number, y: number, w: number) => {
    const f = fixed.find((q) => same(q, s)), m = mine.find((q) => same(q, s))
    return (
      <rect
        key={`hit${s.beam}${s.pos}`}
        className={`bb-hit${cursor && same(cursor, s) ? ' is-cursor' : ''}`}
        x={x - w / 2} y={y - 70} width={w} height={84}
        role="button" tabIndex={0}
        aria-label={`${slotName(s)}: ${f ? `fixed weight ${f.mass}` : m ? `your weight ${m.mass}` : 'empty'}`}
        onClick={() => onPeg!(s)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPeg!(s) } }}
      />
    )
  }
  const describe = (b: BeamId) => [...fixed.filter((w) => w.beam === b).map((w) => `fixed ${w.mass} at ${side(w.pos)}`), ...mine.filter((w) => w.beam === b).map((w) => `your ${w.mass} at ${side(w.pos)}`)].join(', ') || 'nothing'
  const label = two
    ? `Two beams. Top beam: ${describe('top')}; the lower beam hangs from peg ${side(hangAt!)}. Lower beam: ${describe('low')}.`
    : `A seesaw: ${describe('top')}.`

  return (
    <svg ref={svg} className="bb-svg" viewBox={`-20 0 360 ${H}`} role="img" aria-label={label} data-fixed={JSON.stringify(fixed)} data-hang={hangAt ?? ''}>
      <path className="bb-pivot" d={`M${PX} ${PY + 2} L${PX - 20} ${PY + 40} L${PX + 20} ${PY + 40} Z`} />
      {!two && <line className="bb-ground" x1={20} x2={300} y1={PY + 41} y2={PY + 41} />}
      <g ref={top} transform={`rotate(${state.current.a} ${PX} ${PY})`}>
        <rect className="bb-bar" x={PX - 145} y={PY - 5} width={290} height={10} rx={5} />
        {PEGS.map((p) => <circle key={p} className={p === hangAt ? 'bb-hook' : 'bb-peg'} cx={xOf(p)} cy={PY} r={p === hangAt ? 4 : 2.2} />)}
        <circle className="bb-hub" cx={PX} cy={PY} r={4.5} />
        {fixed.filter((w) => w.beam === 'top').map((w) => box(w, 'fixed', xOf(w.pos), PY))}
        {mine.filter((w) => w.beam === 'top').map((w) => box(w, 'mine', xOf(w.pos), PY))}
        {onPeg && PEGS.filter((p) => p !== hangAt).map((p) => hit({ beam: 'top', pos: p }, xOf(p), PY, GAP))}
      </g>
      {two && (
        <>
          <line ref={string} className="bb-string" />
          <g ref={low}>
            <rect className="bb-bar" x={-3.6 * LGAP} y={-4} width={7.2 * LGAP} height={8} rx={4} />
            {LOW_PEGS.map((p) => <circle key={p} className="bb-peg" cx={p * LGAP} cy={0} r={2} />)}
            <circle className="bb-hub" cx={0} cy={0} r={3.5} />
            {fixed.filter((w) => w.beam === 'low').map((w) => box(w, 'fixed', w.pos * LGAP, 0))}
            {mine.filter((w) => w.beam === 'low').map((w) => box(w, 'mine', w.pos * LGAP, 0))}
            {onPeg && LOW_PEGS.map((p) => hit({ beam: 'low', pos: p }, p * LGAP, 0, LGAP))}
          </g>
        </>
      )}
    </svg>
  )
}
