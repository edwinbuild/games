import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { getGame } from './registry'
import { judge, prompt, roundsFor, ROUNDS, type Judged, type P, type Round } from './angle-eye/rounds'
import { newSeed, readChallenge } from '../shell/challenge'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, recordPlay } from '../shell/stats'
import { useRunState } from '../shell/session'
import { AttemptTiles, Button, Score, Stage, type Attempt } from '../ui/components'

const game = getGame('angle-eye')
const grade = (s: number): Attempt => (s >= 8 ? 'hit' : s >= 5 ? 'near' : 'miss')
const KIND_NAMES: Record<Round['kind'], string> = { angle: 'angle', middle: 'middle of a line', double: 'doubling a line', centre: 'centre of a circle' }

function startPoint(r: Round): P {
  if (r.kind === 'angle') {
    const t = (r.base * Math.PI) / 180
    return { x: r.origin.x + Math.cos(t) * 30, y: r.origin.y - Math.sin(t) * 30 }
  }
  if (r.kind === 'middle') return { ...r.a }
  if (r.kind === 'double') return { ...r.b }
  return { x: 50, y: 92 }
}
const clamp = (v: number) => Math.max(2, Math.min(98, v))

/** Where the handle is drawn: angles snap to a 30-unit ray, lines to the line itself. */
function shown(r: Round, p: P): P {
  if (r.kind === 'angle') {
    const d = Math.hypot(p.x - r.origin.x, p.y - r.origin.y) || 1
    return { x: r.origin.x + ((p.x - r.origin.x) / d) * 30, y: r.origin.y + ((p.y - r.origin.y) / d) * 30 }
  }
  if (r.kind === 'middle' || r.kind === 'double') {
    const dx = r.b.x - r.a.x, dy = r.b.y - r.a.y
    const t = ((p.x - r.a.x) * dx + (p.y - r.a.y) * dy) / (dx * dx + dy * dy)
    return { x: r.a.x + dx * t, y: r.a.y + dy * t }
  }
  return p
}

function Board({ round, point, judged, onMove }: { round: Round; point: P; judged: Judged | null; onMove: (p: P) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const toSvg = (e: PointerEvent) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return null
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: clamp(pt.x), y: clamp(pt.y) }
  }
  const move = (e: PointerEvent) => {
    const p = toSvg(e)
    if (p && !judged) onMove(p)
  }
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (d && !judged) {
      e.preventDefault()
      onMove({ x: clamp(point.x + d[0]), y: clamp(point.y + d[1]) })
    }
  }
  const h = shown(round, point)
  return (
    <svg
      ref={svg}
      className="ae-board"
      viewBox="0 0 100 100"
      tabIndex={0}
      role="application"
      aria-label={`${prompt(round)}. Drag, or use the arrow keys, then lock in.`}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
      onPointerMove={(e) => dragging.current && move(e)}
      onPointerUp={() => (dragging.current = false)}
      onKeyDown={key}
    >
      {round.kind === 'angle' && (() => {
        const t = (round.base * Math.PI) / 180
        return (
          <>
            <line className="ae-ink" x1={round.origin.x} y1={round.origin.y} x2={round.origin.x + Math.cos(t) * 30} y2={round.origin.y - Math.sin(t) * 30} />
            <line className="ae-mine" x1={round.origin.x} y1={round.origin.y} x2={h.x} y2={h.y} />
            <circle className="ae-dot" cx={round.origin.x} cy={round.origin.y} r={1.2} />
          </>
        )
      })()}
      {(round.kind === 'middle' || round.kind === 'double') && <line className="ae-ink" x1={round.a.x} y1={round.a.y} x2={round.b.x} y2={round.b.y} />}
      {round.kind === 'double' && <line className="ae-mine ae-dash" x1={round.b.x} y1={round.b.y} x2={h.x} y2={h.y} />}
      {round.kind === 'centre' && <circle className="ae-ink" cx={round.c.x} cy={round.c.y} r={round.r} fill="none" />}
      {judged && <circle className="ae-answer" cx={judged.answer.x} cy={judged.answer.y} r={1.8} />}
      {judged && round.kind === 'angle' && <line className="ae-answer-line" x1={round.origin.x} y1={round.origin.y} x2={judged.answer.x} y2={judged.answer.y} />}
      <circle className="ae-handle" cx={h.x} cy={h.y} r={2.4} />
    </svg>
  )
}

export default function AngleEye() {
  const challenge = readChallenge(game.slug)
  // The run (seed and scores so far) survives a refresh, so a finished or half-played run is never lost.
  const [run, setRun] = useRunState(`${game.slug}:${challenge?.s ?? 'own'}`, () => ({ seed: challenge?.s ?? newSeed(), scores: [] as number[] }))
  const seed = run.seed, scores = run.scores
  const setScores = (s: number[]) => setRun({ seed, scores: s })
  const rounds = roundsFor(seed)
  const [fresh, setFresh] = useState(false)
  const [judged, setJudged] = useState<Judged | null>(null)
  const i = scores.length - (judged ? 1 : 0)
  const round = rounds[Math.min(i, ROUNDS - 1)]
  const [point, setPoint] = useState<P>(() => startPoint(rounds[Math.min(scores.length, ROUNDS - 1)]))
  const done = scores.length === ROUNDS && !judged


  function lockIn() {
    const j = judge(round, point)
    if (j.score >= 8) feel.good()
    else if (j.score < 5) feel.bad()
    else feel.tap()
    setJudged(j)
    const next = [...scores, j.score]
    setScores(next)
    // Recorded at the final answer, not when the total is opened, so a refresh can't lose it.
    if (next.length === ROUNDS) {
      const total = Math.round(next.reduce((a, b) => a + b, 0))
      recordPlay(game.slug, total, undefined, `${total}/100`)
      setFresh(true)
    }
  }
  function next() {
    setJudged(null)
    if (scores.length < ROUNDS) setPoint(startPoint(rounds[scores.length]))
  }
  function replay() {
    // Always a new set of rounds: the answers of the last run have just been shown.
    const s = newSeed()
    setRun({ seed: s, scores: [] })
    setJudged(null)
    setFresh(false)
    setPoint(startPoint(roundsFor(s)[0]))
  }

  const tiles = Array.from({ length: ROUNDS }, (_, k) => (k < scores.length ? grade(scores[k]) : 'empty' as Attempt))
  const total = Math.round(scores.reduce((a, b) => a + b, 0))

  if (done) {
    const bestIdx = scores.indexOf(Math.max(...scores))
    const best = getStats(game.slug).best
    return (
      <>
        <Stage><div className="stack" style={{ justifyItems: 'center' }}><Score label="Total" value={`${total}/100`} /><AttemptTiles attempts={tiles} /></div></Stage>
        <ResultCard
          game={game}
          headline={`${total} / 100`}
          detail={`Best round: ${KIND_NAMES[rounds[bestIdx].kind]}, ${scores[bestIdx]}/10${best != null && best > total ? ` · your best ${best}/100` : ''}`}
          shareText={`📐 Angle Eye\n${tiles.map((t) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[t]).join('')}\n${total}/100`}
          finishData={{ total }}
          trackFinish={fresh}
          challenge={{ seed, score: total, text: `${total}/100`, lowerIsBetter: false }}
          onReplay={replay}
        />
      </>
    )
  }

  return (
    <Stage flush>
      <div className="stack">
        <div className="between" style={{ padding: '0 var(--space-2)' }}>
          <span className="small muted">Round {i + 1} of {ROUNDS}</span>
          <AttemptTiles attempts={tiles} />
        </div>
        <p className="result" style={{ margin: 0 }}>{prompt(round)}</p>
        <Board round={round} point={point} judged={judged} onMove={setPoint} />
        <div style={{ padding: '0 var(--space-2) var(--space-2)' }}>
          {judged ? (
            <div className="stack">
              <p className="body-strong" style={{ margin: 0 }}>{judged.score}/10 · {judged.error}</p>
              <Button size="lg" block color={game.color} onClick={next} data-primary="click" hint="Space">
                {scores.length < ROUNDS ? 'Next round' : 'See your total'}
              </Button>
            </div>
          ) : (
            <Button size="lg" block color={game.color} onClick={lockIn} data-primary="click" hint="Enter">Lock in</Button>
          )}
        </div>
      </div>
    </Stage>
  )
}
