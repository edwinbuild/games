import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { flip, N, puzzleFor, shortestSolution, solved, type Grid } from './flip-grid/grid'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Button, Score, Stage } from '../ui'

const game = getGame('flip-grid')

export default function FlipGrid() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const start = useMemo(() => puzzleFor(seed), [seed])
  const par = useMemo(() => shortestSolution(start)!.length, [start])
  // Each finished try is its number of moves; the fewest counts.
  const [tries, setTries] = useState<number[]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[])))
  const [playing, setPlaying] = useState(tries.length === 0)
  const [taps, setTaps] = useState<number[]>([])
  const [focus, setFocus] = useState(12)
  const [fresh, setFresh] = useState(false)
  const [pop, setPop] = useState<number | null>(null)
  const cells = useRef<(HTMLButtonElement | null)[]>([])
  const grid: Grid = useMemo(() => taps.reduce(flip, start), [taps, start])
  const left = grid.filter(Boolean).length

  useEffect(() => {
    if (!playing || !solved(grid) || taps.length === 0) return
    const all = [...tries, taps.length]
    setTries(all)
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = Math.min(...all)
      recordDaily(game.slug, -best, new Date(), `${best} moves`)
    }
    feel.done()
    setFresh(true)
    const t = setTimeout(() => setPlaying(false), 450)
    return () => clearTimeout(t)
  }, [grid]) // eslint-disable-line react-hooks/exhaustive-deps

  function tap(i: number) {
    if (solved(grid) && taps.length) return
    feel.tap()
    setTaps((t) => [...t, i])
    setPop(i)
    setFocus(i)
  }
  function undo() {
    if (!taps.length || solved(grid)) return
    setTaps((t) => t.slice(0, -1))
  }
  function again() {
    setTaps([])
    setFocus(12)
    setPop(null)
    setPlaying(true)
  }
  function onKey(e: globalThis.KeyboardEvent) {
    if (!playing || e.metaKey || e.ctrlKey || e.altKey) return
    if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -N, ArrowDown: N }
    if (e.key in moves) {
      e.preventDefault()
      const r = Math.floor(focus / N), c = focus % N
      const d = moves[e.key]
      const next = d === -1 ? (c > 0 ? focus - 1 : focus) : d === 1 ? (c < N - 1 ? focus + 1 : focus)
        : d === -N ? (r > 0 ? focus - N : focus) : r < N - 1 ? focus + N : focus
      setFocus(next)
      if (document.activeElement?.closest('.fg-grid')) cells.current[next]?.focus()
    } else if (e.key === 'Backspace' || e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'u') {
      e.preventDefault()
      undo()
    }
  }

  const keys = useRef(onKey)
  keys.current = onKey
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => keys.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const best = tries.length ? Math.min(...tries) : null

  if (!playing && best !== null) {
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    const vsPar = best === par ? 'on par' : best < par ? `${par - best} under par` : `${best - par} over par`
    return (
      <>
        <Stage>
          <div className="stack" style={{ justifyItems: 'center' }}>
            <div className="fg-grid fg-grid--done" aria-hidden="true">
              {start.map((_, i) => <span key={i} className="fg-tile" />)}
            </div>
            {fresh && tries.length > 0 && <p className="body-strong" style={{ margin: 0 }}>Last try: {tries[tries.length - 1]} moves</p>}
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={`${best} moves`}
          detail={<>Par {par}, {vsPar} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🔲 Flip Grid ${puzzleLabel(day)}\nSolved in ${best} moves (par ${par})\nBest of ${n}`}
          finishData={{ score: best, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best, text: `${best} moves`, lowerIsBetter: true }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <Stage>
      <div className="stack">
        <div className="between">
          <Score label="Moves" value={String(taps.length)} size="md" />
          <Score label="Par" value={String(par)} size="md" />
          <Score label="Lit left" value={String(left)} size="md" />
        </div>
        <div className="fg-grid" role="grid" aria-label="Flip grid, 5 by 5">
          {grid.map((dark, i) => (
            <button
              key={i}
              ref={(el) => { cells.current[i] = el }}
              type="button"
              className={`fg-tile${dark ? ' is-dark' : ''}${pop !== null && near(pop, i) ? ' is-pop' : ''}`}
              style={{ animationName: pop !== null && near(pop, i) ? (taps.length % 2 ? 'fg-flip-a' : 'fg-flip-b') : undefined }}
              aria-label={`Row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}, ${dark ? 'lit' : 'off'}`}
              tabIndex={i === focus ? 0 : -1}
              data-primary={i === focus ? 'click' : undefined}
              data-cursor={i === focus || undefined}
              onClick={() => tap(i)}
            />
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Button variant="secondary" onClick={undo} disabled={!taps.length} hint="Z">Undo</Button>
          <Button variant="secondary" onClick={() => setTaps([])} disabled={!taps.length}>Start over</Button>
        </div>
        <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>
          {best !== null ? `Today's best: ${best} moves. ` : ''}Tapping a tile flips it and the tiles above, below and beside it.
        </p>
      </div>
    </Stage>
  )
}

function near(a: number, b: number) {
  const ra = Math.floor(a / N), ca = a % N, rb = Math.floor(b / N), cb = b % N
  return Math.abs(ra - rb) + Math.abs(ca - cb) <= 1
}
