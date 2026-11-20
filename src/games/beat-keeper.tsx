import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { LEAD, periodMs, score, SILENT, tempoFor, type Result } from './beat-keeper/beat'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel, soundOn, tone } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Stage } from '../ui/components'

const game = getGame('beat-keeper')
/** Within this many ms on average is great timing. */
const GREAT = 20
const LEAD_IN_MS = 700
type Phase = 'ready' | 'play' | 'reveal' | 'done'

export default function BeatKeeper() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const bpm = tempoFor(seed)
  const p = periodMs(bpm)
  const [tries, setTries] = useState<number[]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[])))
  const [phase, setPhase] = useState<Phase>(tries.length ? 'done' : 'ready')
  const [result, setResult] = useState<Result | null>(null)
  const [fresh, setFresh] = useState(false)
  const start = useRef(0)
  const tapList = useRef<number[]>([])
  const pulse = useRef<HTMLSpanElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const ripple = useRef<HTMLSpanElement>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  function begin() {
    start.current = performance.now() + LEAD_IN_MS
    tapList.current = []
    setResult(null)
    setPhase('play')
    phaseRef.current = 'play'
    // The lead-in beats are scheduled on the audio clock so they are exactly in time.
    for (let i = 0; i < LEAD; i++) tone(i % 4 === 0 ? 1046 : 784, 70, { type: 'triangle', volume: 0.14, at: (LEAD_IN_MS + i * p) / 1000 })
  }

  // The pulse: drawn from the clock every frame by writing styles directly, so React never renders mid-beat.
  useEffect(() => {
    if (phase !== 'play') return
    let raf = 0
    const end = start.current + (LEAD + SILENT) * p + p / 2
    const frame = () => {
      const now = performance.now()
      const t = now - start.current
      const k = Math.floor(t / p)
      const f = t / p - k
      const el = pulse.current, txt = label.current
      if (el && txt) {
        if (t < 0) { el.style.transform = 'scale(.6)'; el.style.opacity = '.5'; txt.textContent = 'Get ready…' }
        else if (k < LEAD) {
          el.style.transform = `scale(${0.85 + 0.2 * Math.max(0, 1 - f * 4)})`
          el.style.opacity = '1'
          txt.textContent = k >= LEAD - 4 ? `Keep going after ${LEAD - k}…` : `Beat ${k + 1} · tap along`
        } else {
          el.style.transform = 'scale(.8)'
          el.style.opacity = '.18'
          txt.textContent = `Silent · beat ${Math.min(SILENT, k - LEAD + 1)} of ${SILENT}`
        }
      }
      if (now >= end) return finish()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function tap() {
    if (phaseRef.current !== 'play') return
    tapList.current.push(performance.now())
    feel.light()
    const r = ripple.current
    if (r) { r.classList.remove('is-on'); void r.offsetWidth; r.classList.add('is-on') }
  }

  function finish() {
    const r = score(tapList.current, start.current, bpm)
    setResult(r)
    setPhase('reveal')
    phaseRef.current = 'reveal'
    if (r.mean <= GREAT) { feel.chime(4); feel.success() } else feel.thud()
    const all = [...tries, r.mean]
    setTries(all)
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = Math.min(...all)
      recordDaily(game.slug, best, new Date(), `±${best} ms`, true)
    }
    setFresh(true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest('input, textarea, a')) return
      if (phaseRef.current === 'play') { e.preventDefault(); tap() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  if (phase === 'done' && tries.length) {
    const best = Math.min(...tries)
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <ResultCard
        game={game}
        headline={`±${best} ms`}
        detail={<>Average timing error over {SILENT} silent beats at {bpm} bpm · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
        shareText={`🥁 Beat Keeper ${puzzleLabel(day)}\nKept ${bpm} bpm to ±${best} ms\nBest of ${n}`}
        finishData={{ score: best, tries: tries.length }}
        trackFinish={fresh}
        challenge={{ seed, score: best, text: `±${best} ms`, lowerIsBetter: true }}
        onReplay={() => setPhase('ready')}
        replayLabel="Try again"
      />
    )
  }

  if (phase === 'reveal' && result) {
    return (
      <Stage style={{ position: 'relative' }}>
        <div className="stack" style={{ justifyItems: 'center' }}>
          <p className="score-xl" style={{ margin: 0 }}>±{result.mean} ms</p>
          <p className="body-strong" style={{ margin: 0 }}>{result.drift === 'steady' ? 'Steady all the way' : result.drift === 'slow' ? 'You drifted slow' : 'You drifted fast'}{result.errors.some((e) => e == null) ? ` · ${result.errors.filter((e) => e == null).length} missed` : ''}</p>
          <Strip errors={result.errors} />
          <p className="small muted center" style={{ margin: 0 }}>Tall marks are the real beats; dots are your taps. Left of a mark is early, right is late.</p>
          <Button size="lg" block color={game.color} onClick={() => setPhase('done')} data-primary="click" hint="Space">See my result</Button>
        </div>
        {fresh && result.mean <= GREAT && <Burst y="18%" color={game.color} />}
      </Stage>
    )
  }

  const playing = phase === 'play'
  return (
    <Stage
      className="bk-stage"
      role="button"
      tabIndex={0}
      aria-label={playing ? 'Tap in time with the beat' : 'Start'}
      onPointerDown={(e) => { if (playing) { e.preventDefault(); tap() } }}
    >
      <div className="stack" style={{ justifyItems: 'center' }}>
        <span className="bk-ring">
          <span ref={pulse} className="bk-pulse" />
          <span ref={ripple} className="bk-ripple" />
        </span>
        <span ref={label} className="body-strong" aria-live="off">{playing ? 'Get ready…' : `${bpm} beats per minute`}</span>
        {!playing && (
          <>
            <p className="small muted center" style={{ margin: 0 }}>Tap along with {LEAD} beats, then keep tapping in time for {SILENT} more after the beat goes silent.{soundOn() ? '' : ' Turn sound on to hear the beat; the circle shows it too.'}</p>
            <Button size="lg" block color={game.color} onClick={begin} data-primary="click" hint="Space">{tries.length ? 'Try again' : 'Start the beat'}</Button>
          </>
        )}
      </div>
    </Stage>
  )
}

/** The silent beats as tall marks, with each tap as a dot placed early or late. */
function Strip({ errors }: { errors: (number | null)[] }) {
  const w = 320, h = 70, gap = w / errors.length
  const spread = Math.max(60, ...errors.map((e) => Math.abs(e ?? 0)))
  return (
    <svg className="bk-strip" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Your taps: ${errors.map((e) => (e == null ? 'missed' : `${e > 0 ? '+' : ''}${e} ms`)).join(', ')}`}>
      {errors.map((e, k) => {
        const x = gap * (k + 0.5)
        return (
          <g key={k} style={{ animationDelay: `${k * 90}ms` }} className="bk-strip-beat">
            <line x1={x} x2={x} y1={10} y2={h - 10} className="bk-strip-mark" />
            {e == null ? <text x={x} y={h / 2 + 4} textAnchor="middle" className="bk-strip-miss">×</text>
              : <circle cx={x + (e / spread) * (gap * 0.42)} cy={h / 2} r={6} className={Math.abs(e) <= GREAT ? 'bk-strip-tap is-good' : 'bk-strip-tap'} />}
          </g>
        )
      })}
    </svg>
  )
}
