import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { dailyRandom, puzzleLabel } from '../shell/daily'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, recordPlay, saveToday } from '../shell/stats'

const game = getGame('blind-timer')
const ATTEMPTS = 3
const VISIBLE_MS = 1000

export function targetFor(d = new Date()): number {
  const r = dailyRandom(game.slug, d)
  return Math.round((5 + r() * 7) * 100) / 100 // 5.00–12.00 s
}

const randomTarget = () => Math.round((5 + Math.random() * 7) * 100) / 100
const fmt = (s: number) => s.toFixed(2)
const square = (off: number) => (Math.abs(off) < 0.1 ? '🟩' : Math.abs(off) < 0.5 ? '🟨' : '🟥')
const bestOf = (offs: number[]) => offs.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a))

export default function BlindTimer() {
  const [mode, setMode] = useState<'daily' | 'practice'>('daily')
  const [dailyOffs, setDailyOffs] = useState<number[]>(() => loadToday(game.slug, [] as number[]))
  const [practiceTarget, setPracticeTarget] = useState(() => randomTarget())
  const [practiceOff, setPracticeOff] = useState<number | null>(null)

  const target = mode === 'daily' ? targetFor() : practiceTarget
  const dailyDone = dailyOffs.length >= ATTEMPTS || dailyOffs.some((o) => Math.abs(o) < 0.005)

  function onDailyStop(elapsed: number) {
    const off = Math.round((elapsed - target) * 100) / 100
    const next = [...dailyOffs, off]
    setDailyOffs(next)
    saveToday(game.slug, next)
    if (next.length >= ATTEMPTS || Math.abs(off) < 0.005) {
      recordDaily(game.slug, Math.abs(bestOf(next)))
    }
  }

  function onPracticeStop(elapsed: number) {
    const off = Math.round((elapsed - target) * 100) / 100
    setPracticeOff(off)
    recordPlay('blind-timer-practice', Math.abs(off), (a, b) => a < b)
  }

  if (mode === 'practice') {
    const best = getStats('blind-timer-practice').best
    return (
      <>
        <Timer key={practiceTarget} target={target} onStop={onPracticeStop} disabled={practiceOff !== null} />
        {practiceOff !== null && (
          <div className="stage" style={{ marginTop: 12 }}>
            <p className="big-number">{offText(practiceOff)}</p>
            {best != null && <p className="label">Best practice: off by {fmt(best)}s</p>}
            <div className="row">
              <button className="btn btn-primary" onClick={() => { setPracticeOff(null); setPracticeTarget(randomTarget()) }}>
                New target
              </button>
              <button className="btn" onClick={() => setMode('daily')}>Back to daily</button>
            </div>
          </div>
        )}
      </>
    )
  }

  const stats = getStats(game.slug)
  return (
    <>
      {!dailyDone && <p className="label" style={{ textAlign: 'center', margin: '0 0 8px' }}>
        Attempt {Math.min(dailyOffs.length + 1, ATTEMPTS)} of {ATTEMPTS}
      </p>}
      {!dailyDone && <Timer key={dailyOffs.length} target={target} onStop={onDailyStop} />}

      {dailyOffs.length > 0 && !dailyDone && (
        <p className="label" style={{ textAlign: 'center' }}>
          Last try: {offText(dailyOffs[dailyOffs.length - 1])} {square(dailyOffs[dailyOffs.length - 1])}
        </p>
      )}

      {dailyDone && (
        <ResultCard
          game={game}
          headline={offText(bestOf(dailyOffs))}
          detail={
            <>
              Target {fmt(target)}s · tries {dailyOffs.map(square).join('')}
              {stats.streak > 0 && <> · 🔥 {stats.streak} day streak</>}
            </>
          }
          shareText={`⏱️ Blind Timer ${puzzleLabel()}\nTarget ${fmt(target)}s\n${dailyOffs.map(square).join('')} ${offText(bestOf(dailyOffs))}`}
          finishData={{ off: Math.abs(bestOf(dailyOffs)) }}
          extra={
            <button className="btn btn-link" onClick={() => setMode('practice')}>
              Practice with random targets
            </button>
          }
        />
      )}
    </>
  )
}

function offText(off: number) {
  if (Math.abs(off) < 0.005) return 'Perfect! 0.00s'
  return `${off > 0 ? 'Late' : 'Early'} by ${fmt(Math.abs(off))}s`
}

/** Start/stop button with a clock that hides after the first second. */
function Timer({ target, onStop, disabled }: { target: number; onStop: (elapsed: number) => void; disabled?: boolean }) {
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
    if (disabled) return
    const t = performance.now()
    if (start == null) {
      setStart(t)
      setNow(t)
    } else if (stopped == null) {
      const e = (t - start) / 1000
      setStopped(e)
      onStop(e)
    }
  }

  return (
    <div className="stage">
      <p className="label" style={{ margin: 0 }}>Target</p>
      <p className="big-number" style={{ margin: '0 0 12px', color: 'var(--accent)' }}>{fmt(target)}s</p>
      <p className="big-number" style={{ margin: '0 0 16px', opacity: hidden ? 0.35 : 1 }} aria-live="off">
        {hidden ? '??.??' : fmt(elapsed)}
      </p>
      <button
        className="btn btn-big"
        onPointerDown={press}
        onClick={(e) => e.detail === 0 && press() /* keyboard */}
        disabled={disabled || stopped != null}>
        {start == null ? 'Start' : stopped == null ? 'Stop' : 'Stopped'}
      </button>
    </div>
  )
}
