import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { dailyRandom, puzzleLabel } from '../shell/daily'
import { ResultCard } from '../shell/ResultCard'
import { feel } from '../shell/feel'
import { getStats, loadToday, recordDaily, recordPlay, saveToday } from '../shell/stats'
import { AttemptTiles, Button, Score, Stage, type Attempt } from '../ui'

const game = getGame('blind-timer')
const ATTEMPTS = 3
const VISIBLE_MS = 1000

export function targetFor(d = new Date()): number {
  const r = dailyRandom(game.slug, d)
  return Math.round((5 + r() * 7) * 100) / 100 // 5.00–12.00 s
}

const randomTarget = () => Math.round((5 + Math.random() * 7) * 100) / 100
const fmt = (s: number) => s.toFixed(2)
const grade = (off: number): Attempt => (Math.abs(off) < 0.1 ? 'hit' : Math.abs(off) < 0.5 ? 'near' : 'miss')
const square = (off: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(off)]
const bestOf = (offs: number[]) => offs.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a))
const tiles = (offs: number[]): Attempt[] => Array.from({ length: ATTEMPTS }, (_, i) => (i < offs.length ? grade(offs[i]) : 'empty'))

function offText(off: number) {
  if (Math.abs(off) < 0.005) return 'Perfect! 0.00s'
  return `${off > 0 ? 'Late' : 'Early'} by ${fmt(Math.abs(off))}s`
}

export default function BlindTimer() {
  const [mode, setMode] = useState<'daily' | 'practice'>('daily')
  const [dailyOffs, setDailyOffs] = useState<number[]>(() => loadToday(game.slug, [] as number[]))
  const [practiceTarget, setPracticeTarget] = useState(randomTarget)
  const [practiceOff, setPracticeOff] = useState<number | null>(null)

  const target = mode === 'daily' ? targetFor() : practiceTarget
  const dailyDone = dailyOffs.length >= ATTEMPTS || dailyOffs.some((o) => Math.abs(o) < 0.005)

  function onDailyStop(elapsed: number) {
    const off = Math.round((elapsed - target) * 100) / 100
    const next = [...dailyOffs, off]
    setDailyOffs(next)
    saveToday(game.slug, next)
    if (next.length >= ATTEMPTS || Math.abs(off) < 0.005) {
      const best = Math.abs(bestOf(next))
      recordDaily(game.slug, best, new Date(), `${fmt(best)}s`)
    }
  }

  function onPracticeStop(elapsed: number) {
    const off = Math.round((elapsed - target) * 100) / 100
    setPracticeOff(off)
    recordPlay('blind-timer-practice', Math.abs(off), (a, b) => a < b, `${fmt(Math.abs(off))}s`)
  }

  if (mode === 'practice') {
    const best = getStats('blind-timer-practice').best
    return (
      <div className="stack">
        <Timer key={practiceTarget} target={target} onStop={onPracticeStop} />
        {practiceOff !== null && (
          <Stage>
            <div className="stack">
              <p className="result">{offText(practiceOff)}</p>
              {best != null && <p className="small muted">Best practice: off by {fmt(best)}s</p>}
              <div className="row">
                <Button color={game.color} onClick={() => { setPracticeOff(null); setPracticeTarget(randomTarget()) }}>New target</Button>
                <Button variant="secondary" onClick={() => setMode('daily')}>Back to daily</Button>
              </div>
            </div>
          </Stage>
        )}
      </div>
    )
  }

  const stats = getStats(game.slug)
  if (dailyDone) {
    const best = bestOf(dailyOffs)
    return (
      <>
        <Stage>
          <div className="stack" style={{ justifyItems: 'center' }}>
            <Score label="Today's target" value={`${fmt(target)}s`} size="md" />
            <AttemptTiles attempts={tiles(dailyOffs)} />
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={offText(best)}
          detail={<>Target {fmt(target)}s{stats.streak > 0 && <> · {stats.streak} day streak</>}</>}
          shareText={`⏱️ Blind Timer ${puzzleLabel()}\nTarget ${fmt(target)}s\n${dailyOffs.map(square).join('')} ${offText(best)}`}
          finishData={{ off: Math.abs(best) }}
          extra={<Button variant="ghost" onClick={() => setMode('practice')}>Practice with random targets</Button>}
        />
      </>
    )
  }

  return (
    <div className="stack">
      <div className="between">
        <span className="small muted">Attempt {dailyOffs.length + 1} of {ATTEMPTS}</span>
        <AttemptTiles attempts={tiles(dailyOffs)} />
      </div>
      <Timer key={dailyOffs.length} target={target} onStop={onDailyStop} />
      {dailyOffs.length > 0 && (
        <p className="small muted center">Last try: {offText(dailyOffs[dailyOffs.length - 1])}</p>
      )}
    </div>
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
