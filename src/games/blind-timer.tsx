import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { dailyRandom, puzzleLabel } from '../shell/daily'
import { ResultCard } from '../shell/ResultCard'
import { feel } from '../shell/feel'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { AttemptTiles, Button, Score, Stage, type Attempt } from '../ui'

const game = getGame('blind-timer')
const VISIBLE_MS = 1000

export function targetFor(d = new Date()): number {
  const r = dailyRandom(game.slug, d)
  return Math.round((5 + r() * 7) * 100) / 100 // 5.00–12.00 s
}

const fmt = (s: number) => s.toFixed(2)
const grade = (off: number): Attempt => (Math.abs(off) < 0.1 ? 'hit' : Math.abs(off) < 0.5 ? 'near' : 'miss')
const square = (off: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(off)]
const bestOf = (offs: number[]) => offs.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a))

function offText(off: number) {
  if (Math.abs(off) < 0.005) return 'Perfect! 0.00s'
  return `${off > 0 ? 'Late' : 'Early'} by ${fmt(Math.abs(off))}s`
}

export default function BlindTimer() {
  // Unlimited tries on today's target; the closest one counts and is what gets shared.
  const [offs, setOffs] = useState<number[]>(() => loadToday(game.slug, [] as number[]))
  const [playing, setPlaying] = useState(offs.length === 0)
  const target = targetFor()

  function onStop(elapsed: number) {
    const off = Math.round((elapsed - target) * 100) / 100
    const next = [...offs, off]
    setOffs(next)
    saveToday(game.slug, next)
    const best = Math.abs(bestOf(next))
    recordDaily(game.slug, best, new Date(), `${fmt(best)}s`)
    setTimeout(() => setPlaying(false), 600)
  }

  const stats = getStats(game.slug)
  const recent = offs.slice(-10)
  const tries = `${offs.length} ${offs.length === 1 ? 'try' : 'tries'}`

  if (playing || offs.length === 0) {
    return (
      <div className="stack">
        <div className="between">
          <span className="small muted">{offs.length ? `Try ${offs.length + 1} · best so far ${fmt(Math.abs(bestOf(offs)))}s off` : 'First try'}</span>
          {offs.length > 0 && <AttemptTiles attempts={recent.slice(-5).map(grade)} />}
        </div>
        <Timer key={offs.length} target={target} onStop={onStop} />
        {offs.length > 0 && <p className="small muted center">Last try: {offText(offs[offs.length - 1])}</p>}
      </div>
    )
  }

  const best = bestOf(offs)
  const last = offs[offs.length - 1]
  return (
    <>
      <Stage>
        <div className="stack" style={{ justifyItems: 'center' }}>
          <Score label="Today's target" value={`${fmt(target)}s`} size="md" />
          <p className="body-strong" style={{ margin: 0 }}>Last try: {offText(last)}</p>
          <AttemptTiles attempts={recent.slice(-5).map(grade)} />
        </div>
      </Stage>
      <ResultCard
        game={game}
        headline={offText(best)}
        detail={<>Your best of {tries} today{stats.streak > 1 && <> · {stats.streak} day streak</>}</>}
        shareText={`⏱️ Blind Timer ${puzzleLabel()}\nTarget ${fmt(target)}s\n${recent.map(square).join('')}\n${offText(best)}, best of ${tries}`}
        finishData={{ off: Math.abs(best), tries: offs.length }}
        onReplay={() => setPlaying(true)}
        replayLabel="Try again"
      />
    </>
  )
}

/** Start/stop key with a clock that hides after the first second. */
function Timer({ target, onStop }: { target: number; onStop: (elapsed: number) => void }) {
  const [start, setStart] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [stopped, setStopped] = useState<number | null>(null)
  const raf = useRef(0)

  useEffect(() => {
    if (start == null || stopped != null) return
    const tick = () => {
      setNow(performance.now())
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [start, stopped])

  const elapsed = stopped ?? (start == null ? 0 : (now - start) / 1000)
  const hidden = start != null && stopped == null && elapsed * 1000 > VISIBLE_MS

  function press() {
    const t = performance.now()
    if (start == null) {
      setStart(t)
      setNow(t)
      feel.tap()
    } else if (stopped == null) {
      const e = (t - start) / 1000
      setStopped(e)
      if (Math.abs(e - target) < 0.1) feel.good()
      else feel.tap()
      onStop(e)
    }
  }

  return (
    <Stage>
      <div className="stack">
        <Score label="Target" value={`${fmt(target)}s`} size="md" />
        <Score value={hidden ? '??.??' : fmt(elapsed)} tone={hidden ? 'hidden' : 'default'} />
        <Button
          size="lg"
          block
          color={game.color}
          disabled={stopped != null}
          onPointerDown={press}
          onClick={(e) => e.detail === 0 && press() /* keyboard */}
        >
          {start == null ? 'Start' : stopped == null ? 'Stop' : 'Stopped'}
        </Button>
      </div>
    </Stage>
  )
}
