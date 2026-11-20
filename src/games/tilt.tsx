import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { DIRS, puzzleFor, solve, solved, tilt, type Dir, type State } from './tilt/board'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { HintButton, hintUsed } from '../shell/Hint'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { load } from '../shell/storage'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Stage } from '../ui/components'

const game = getGame('tilt')
/** Each marble's colour token and shape (so the colours never have to be told apart). */
const MARBLES = [{ color: 'chili', glyph: '●', name: 'round' }, { color: 'sky', glyph: '▲', name: 'triangle' }, { color: 'lime', glyph: '■', name: 'square' }]
const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' }
const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
/** Milliseconds a marble takes to roll one square. */
const ROLL = 70

export default function Tilt() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const p = useMemo(() => puzzleFor(seed), [seed])
  const [tries, setTries] = useState<number[]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[])))
  // Every state so far (the first is the start), so undo and a refresh both work.
  const [history, setHistory] = useRunState<State[]>(`${game.slug}:${seed}:${oneOff ? 'once' : tries.length}`, () => [p.start])
  const [done, setDone] = useState(tries.length > 0 && history.length === 1)
  const [fresh, setFresh] = useState(false)
  const [rolling, setRolling] = useState(0)
  const [hintDir, setHintDir] = useState<Dir | null>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const state = history[history.length - 1]
  const tilts = history.length - 1
  const allIn = solved(state)
  // Can it still be done from here? (Small boards: the full search is quick.)
  const stuck = useMemo(() => !allIn && solve(p, state) == null, [p, state, allIn])
  const showSolution = useMemo(() => load<boolean>('test-solutions', false), [])

  function go(dir: Dir) {
    if (allIn || rolling || done) return
    const { state: next, paths } = tilt(p, state, dir)
    setHintDir(null)
    if (next.every((x, i) => x === state[i])) { feel.bad(); return }
    const longest = Math.max(...paths.map((q) => q.length - 1))
    const h = [...history, next]
    setHistory(h)
    setRolling(longest * ROLL + 80)
    feel.light()
    paths.forEach((q, i) => { if (state[i] >= 0 && next[i] < 0) setTimeout(() => feel.pop(4 + i), (q.length - 1) * ROLL) })
    if (solved(next)) {
      const n = h.length - 1
      const all = [...tries, n]
      if (!oneOff) {
        saveToday(game.slug, all)
        const best = Math.min(...all)
        recordDaily(game.slug, best, new Date(), count(best, 'tilt'), true)
      }
      setFresh(true)
      setTimeout(() => feel.success(), longest * ROLL)
    }
  }
  useEffect(() => {
    if (!rolling) return
    const t = setTimeout(() => setRolling(0), rolling)
    return () => clearTimeout(t)
  }, [rolling])

  // Keyboard: arrows (or WASD) tilt, Z undoes.
  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea')) return
      if (e.key in KEYS) { e.preventDefault(); go(KEYS[e.key]) }
      else if (e.key === 'z' || e.key === 'Z') undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function undo() {
    if (history.length <= 1 || allIn || rolling) return
    setHistory(history.slice(0, -1))
    setHintDir(null)
    feel.tap()
  }
  /** A hint: which way to tilt next (the first tilt of a shortest way from here, after undoing out of a dead end). */
  function hint() {
    for (let k = history.length - 1; k >= 0; k--) {
      const way = solve(p, history[k])
      if (!way?.length) continue
      if (k < history.length - 1) setHistory(history.slice(0, k + 1))
      setHintDir(way[0])
      return
    }
    return false
  }
  function seeResult() {
    setTries([...tries, tilts])
    setDone(true)
  }
  function again() {
    setHistory([p.start])
    setDone(false)
  }

  if (done && tries.length) {
    const best = Math.min(...tries)
    const n = count(tries.length, 'try', 'tries')
    const stats = getStats(game.slug)
    return (
      <ResultCard
        game={game}
        headline={`All in with ${count(best, 'tilt')}`}
        detail={<>{p.w}×{p.h} board · {count(p.start.length, 'marble')} · par {p.par}{best === p.par ? ' · on par' : ''} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
        shareText={`🎱 Tilt ${puzzleLabel(day)}\nAll ${p.start.length} marbles in with ${count(best, 'tilt')} (par ${p.par})\n${Array.from({ length: best }, (_, i) => (i < p.par ? '🟩' : '🟨')).join('')}`}
        finishData={{ tilts: best, par: p.par, tries: tries.length }}
        trackFinish={fresh}
        challenge={{ seed, score: best, text: count(best, 'tilt'), lowerIsBetter: true }}
        hinted={!oneOff && hintUsed(game.slug)}
        onReplay={again}
        replayLabel="Try again"
      />
    )
  }

  const cell = (c: number) => ({ left: `${((c % p.w) / p.w) * 100}%`, top: `${(Math.floor(c / p.w) / p.h) * 100}%`, width: `${100 / p.w}%`, height: `${100 / p.h}%` })
  // A dropped marble is drawn on its hole, shrinking away.
  const shown = state.map((c, i) => (c >= 0 ? c : p.holes[i]))
  const prev = history.length > 1 ? history[history.length - 2] : null
  const dist = (i: number) => (prev && prev[i] >= 0 ? Math.abs((shown[i] % p.w) - (prev[i] % p.w)) + Math.abs(Math.floor(shown[i] / p.w) - Math.floor(prev[i] / p.w)) : 0)
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">Par {p.par}{tries.length ? ` · try ${tries.length + 1}` : ''}</span>
        <span className="small muted" aria-live="polite">{count(tilts, 'tilt')} · {count(state.filter((x) => x >= 0).length, 'marble')} to go</span>
      </div>
      <Stage flush className="tl-stage">
        <div
          className={`tl-board${allIn ? ' is-solved' : ''}`}
          style={{ aspectRatio: `${p.w} / ${p.h}` }}
          role="application"
          aria-label={`A ${p.w} by ${p.h} board. Tilt it with the arrow keys or by swiping; every marble rolls until something stops it. Get each marble into the hole with its shape.`}
          data-solution={showSolution ? p.solution.join(' ') : undefined}
          data-state={JSON.stringify(state)}
          onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY } }}
          onPointerUp={(e) => {
            const s = swipe.current
            swipe.current = null
            if (!s) return
            const dx = e.clientX - s.x, dy = e.clientY - s.y
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
            go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
          }}
          onPointerCancel={() => { swipe.current = null }}
        >
          {Array.from({ length: p.w * p.h }, (_, c) => <span key={c} className="tl-floor" style={cell(c)} />)}
          {p.blocks.map((c) => <span key={`b${c}`} className="tl-block" style={cell(c)} aria-hidden="true" />)}
          {p.holes.map((c, i) => (
            <span key={`h${i}`} className={`tl-hole${state[i] < 0 ? ' is-filled' : ''}`} style={{ ...cell(c), '--m': `var(--${MARBLES[i].color})` } as React.CSSProperties} aria-label={`${MARBLES[i].name} hole`}>
              <span aria-hidden="true">{MARBLES[i].glyph}</span>
            </span>
          ))}
          {shown.map((c, i) => (
            <span
              key={`m${i}`}
              className={`tl-marble${state[i] < 0 ? ' is-in' : ''}`}
              style={{ ...cell(c), '--m': `var(--${MARBLES[i].color})`, '--roll': `${dist(i) * ROLL}ms` } as React.CSSProperties}
              aria-label={`${MARBLES[i].name} marble${state[i] < 0 ? ', in its hole' : ''}`}
            >
              <span aria-hidden="true">{MARBLES[i].glyph}</span>
            </span>
          ))}
        </div>
        {allIn && <Burst y="45%" color={game.color} />}
      </Stage>
      <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {allIn ? (
          <Button size="lg" block color={game.color} onClick={seeResult} data-primary="click" hint="Space">See my result ({count(tilts, 'tilt')})</Button>
        ) : (
          <>
            {stuck && <p className="small center tl-msg" role="status">No way to get them all in from here. Undo, or start over.</p>}
            {hintDir && <p className="small center tl-msg" role="status">Hint: tilt {hintDir} {ARROW[hintDir]}</p>}
            <div className="tl-pad" role="group" aria-label="Tilt">
              {DIRS.map((d) => (
                <Button key={d} variant="secondary" className={`tl-key tl-key--${d}${hintDir === d ? ' is-hint' : ''}`} onClick={() => go(d)} aria-label={`Tilt ${d}`}>{ARROW[d]}</Button>
              ))}
            </div>
            <div className="row">
              <Button variant="ghost" onClick={undo} disabled={history.length <= 1} hint="Z">Undo</Button>
              <Button variant="ghost" onClick={() => { setHistory([p.start]); setHintDir(null); feel.tap() }} disabled={history.length <= 1}>Start over</Button>
              <HintButton game={game.slug} oneOff={oneOff} onHint={hint} />
            </div>
            <p className="small muted center" style={{ margin: 0 }}>Swipe on the board, use the arrows, or the keys. Every marble rolls until it hits the edge, a block or another marble, and drops into the hole with its shape. Other holes are just floor to it.</p>
          </>
        )}
      </div>
    </>
  )
}
