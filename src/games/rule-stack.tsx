import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { COLOURS, judge, LEVELS, N, rulesFor, type Colour, type Grid } from './rule-stack/rules'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { load } from '../shell/storage'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Stage } from '../ui/components'

const game = getGame('rule-stack')
/** Colours with a shape each, so the grid reads without telling colours apart. */
const GLYPH = ['●', '▲', '■', '◆']
/** A finished try: levels cleared (out of 12) and seconds taken. */
type Try = { levels: number; secs: number }
type Run = { level: number; grid: Grid; secs: number }
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
/** One number to rank tries: more levels first, then less time. */
export const rank = (t: Try) => t.levels * 10000 - Math.min(9999, Math.round(t.secs))
const label = (t: Try) => (t.levels === LEVELS ? `12/12 in ${clock(t.secs)}` : `${t.levels}/12`)
const empty = (): Grid => Array(N * N).fill(null)

export default function RuleStack() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday(game.slug, [] as Try[])))
  const k = oneOff ? 0 : tries.length
  // Each try has its own twelve rules (the first try is the same for everyone).
  const { rules, hidden } = useMemo(() => rulesFor(seed, k), [seed, k])
  const [run, setRun] = useRunState<Run>(`${game.slug}:${seed}:${oneOff ? 'once' : k}`, () => ({ level: 1, grid: empty(), secs: 0 }))
  const [done, setDone] = useState(tries.length > 0 && run.level === 1 && run.grid.every((x) => x == null))
  const [fresh, setFresh] = useState(false)
  const [finished, setFinished] = useState<Try | null>(null)
  const [paint, setPaint] = useState<Colour>(0)
  const [cursor, setCursor] = useState(0)
  const [now, setNow] = useState(0)
  const since = useRef<number | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const { ok, failing } = judge(rules, run.level, run.grid)
  const secs = run.secs + (since.current != null ? now - since.current : 0)
  const showSolution = useMemo(() => load<boolean>('test-solutions', false), [])

  // The clock runs while you play.
  useEffect(() => {
    if (finished || done) return
    since.current = performance.now() / 1000
    const id = setInterval(() => setNow(performance.now() / 1000), 250)
    setNow(performance.now() / 1000)
    return () => { clearInterval(id); since.current = null }
  }, [finished, done])

  const spent = () => run.secs + (since.current != null ? performance.now() / 1000 - since.current : 0)

  // When every rule so far holds, the next rule arrives (and the twelfth finishes the day).
  useEffect(() => {
    if (!ok || finished || done) return
    const t = setTimeout(() => {
      feel.chime(Math.min(run.level + 1, 14))
      if (run.level === LEVELS) finish(LEVELS)
      else { setRun({ ...run, level: run.level + 1, secs: spent() }); if (since.current != null) since.current = performance.now() / 1000 }
    }, 550)
    return () => clearTimeout(t)
  }, [ok, run.level]) // eslint-disable-line react-hooks/exhaustive-deps

  function finish(levels: number) {
    const t: Try = { levels, secs: Math.round(spent()) }
    setFinished(t)
    if (levels === LEVELS) feel.success(); else feel.thud()
    const all = [...tries, t]
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = all.reduce((a, b) => (rank(b) > rank(a) ? b : a))
      recordDaily(game.slug, rank(best), new Date(), label(best))
    }
    setFresh(true)
  }

  function set(i: number, c: Colour | null) {
    if (finished) return
    setCursor(i)
    const grid = [...run.grid]
    grid[i] = grid[i] === c ? null : c
    setRun({ ...run, grid })
    feel.light()
  }

  // Keyboard: arrows move round the grid, 1–4 paint, 0 or Backspace clears.
  useEffect(() => {
    if (finished || done) return
    const onKey = (e: KeyboardEvent) => {
      // Keys work from the page or from a focused square (Tab to a square, then 1–4).
      const t = e.target as HTMLElement | null
      const onCell = !!t?.closest('.rs-cell')
      if (!onCell && t?.closest('input, textarea, button')) return
      const [r, c] = [Math.floor(cursor / N), cursor % N]
      const mv: Record<string, [number, number]> = { ArrowLeft: [r, c - 1], ArrowRight: [r, c + 1], ArrowUp: [r - 1, c], ArrowDown: [r + 1, c] }
      if (e.key in mv) {
        e.preventDefault()
        const [nr, nc] = mv[e.key]
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
          setCursor(nr * N + nc)
          if (onCell) (grid.current?.children[nr * N + nc] as HTMLElement | undefined)?.focus()
        }
      } else if (/^[1-4]$/.test(e.key)) { e.preventDefault(); const col = (Number(e.key) - 1) as Colour; setPaint(col); set(cursor, col) }
      else if (e.key === '0' || e.key === 'Backspace') { e.preventDefault(); if (run.grid[cursor] != null) set(cursor, run.grid[cursor]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function seeResult() {
    setTries([...tries, finished!])
    setDone(true)
  }
  function again() {
    setFinished(null)
    setDone(false)
    // The next try's run starts empty (its key is new); clear this one too in case of a stop-early try.
    setRun({ level: 1, grid: empty(), secs: 0 })
  }

  if (done && tries.length) {
    const best = tries.reduce((a, b) => (rank(b) > rank(a) ? b : a))
    const n = count(tries.length, 'try', 'tries')
    const stats = getStats(game.slug)
    return (
      <ResultCard
        game={game}
        headline={best.levels === LEVELS ? `All 12 rules in ${clock(best.secs)}` : `${best.levels} of 12 rules`}
        detail={<>Best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
        shareText={`🧩 Rule Stack ${puzzleLabel(day)}\n${'🟨'.repeat(best.levels)}${'⬜'.repeat(LEVELS - best.levels)}\n${label(best)} · best of ${n}`}
        finishData={{ levels: best.levels, secs: best.secs, tries: tries.length }}
        trackFinish={fresh}
        challenge={{ seed, score: rank(best), text: label(best), lowerIsBetter: false }}
        onReplay={again}
        replayLabel="Try again (twelve new rules)"
      />
    )
  }

  const active = rules.slice(0, run.level)
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">Level {Math.min(run.level, LEVELS)} of {LEVELS}{tries.length && !oneOff ? ` · try ${tries.length + 1}` : ''}</span>
        <span className="small muted">{clock(finished ? finished.secs : secs)}</span>
      </div>
      <Stage className="rs-stage" style={{ position: 'relative' }}>
        <div ref={grid} className="rs-grid" role="grid" aria-label="The grid" data-solution={showSolution ? hidden.join('') : undefined}>
          {run.grid.map((c, i) => (
            <button key={i} type="button" role="gridcell" className={`rs-cell${i === cursor ? ' is-cursor' : ''}`} data-colour={c ?? undefined}
              aria-label={`Row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}: ${c == null ? 'empty' : COLOURS[c]}`}
              onFocus={() => setCursor(i)} onClick={() => set(i, paint)}>
              {c != null && <span aria-hidden="true">{GLYPH[c]}</span>}
            </button>
          ))}
        </div>
        {finished?.levels === LEVELS && <Burst y="40%" color={game.color} />}
      </Stage>
      {!finished && (
        <div className="rs-palette" role="radiogroup" aria-label="Paint colour">
          {COLOURS.map((name, c) => (
            <button key={name} type="button" role="radio" aria-checked={paint === c} className="rs-paint" data-colour={c} onClick={() => { setPaint(c as Colour); feel.tap() }} aria-label={name}>
              <span aria-hidden="true">{GLYPH[c]}</span>
            </button>
          ))}
        </div>
      )}
      <ol className="rs-rules" aria-label="Rules so far">
        {[...active].reverse().map((rule, j) => {
          const i = active.length - 1 - j
          const good = !failing.includes(i)
          return (
            <li key={rule.id} className={`rs-rule${good ? ' is-good' : ''}${i === run.level - 1 ? ' is-new' : ''}`}>
              <span className="rs-rule-mark" aria-label={good ? 'holds' : 'broken'}>{good ? '✓' : '✗'}</span>
              <span>{rule.text}</span>
            </li>
          )
        })}
      </ol>
      <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {finished ? (
          <Button size="lg" block color={game.color} onClick={seeResult} data-primary="click" hint="Space">See my result ({label(finished)})</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => finish(run.level - 1)} disabled={run.level === 1}>Stop here ({run.level - 1} of 12 cleared)</Button>
            <p className="small muted center" style={{ margin: 0 }}>Pick a colour and tap squares to paint them (tap again to clear). When every rule holds, a new one arrives, and it may break your grid. Clear all twelve as fast as you can.</p>
          </>
        )}
      </div>
    </>
  )
}
