import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dailyRandom, dateKey, puzzleLabel } from '../shell/daily'
import { feel, tone } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { AttemptTiles, Button, Stage, type Attempt } from '../ui/components'

const game = getGame('pitch-match')
const ROUNDS = 3
const MIN_HZ = 200
const MAX_HZ = 1000

// Slider position (0–1000) <-> frequency, on a log scale so equal moves sound equal.
const toHz = (v: number) => MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, v / 1000)
/** Cents off: 100 cents is one semitone (one piano key). */
const cents = (f: number, target: number) => Math.round(1200 * Math.log2(f / target))
const accuracy = (c: number) => Math.max(0, Math.round(100 - Math.abs(c) / 2))
const grade = (c: number): Attempt => (Math.abs(c) < 15 ? 'hit' : Math.abs(c) < 50 ? 'near' : 'miss')
const square = (c: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(c)]
const randomSlider = () => Math.round(Math.random() * 1000)

/** "Spot on", "Close, a little high", "2.5 semitones low". */
function describe(c: number) {
  const dir = c > 0 ? 'high' : 'low'
  if (Math.abs(c) < 15) return 'Spot on'
  if (Math.abs(c) < 50) return `Close, a little ${dir}`
  if (Math.abs(c) < 100) return `Under a semitone ${dir}`
  return `${(Math.abs(c) / 100).toFixed(1)} semitones ${dir}`
}

export function targetsFor(d = new Date()): number[] {
  const r = dailyRandom(game.slug, d)
  return Array.from({ length: ROUNDS }, () => toHz(150 + r() * 700))
}

// Sound is the game here, so tones play even when the site's sound switch is off.
const play = (hz: number, ms = 700) => tone(hz, ms, { force: true, volume: 0.22 })

/** Waves across the strip for a frequency: twice the pitch, twice the waves (5 at 200 Hz, 25 at 1000 Hz). */
export const cyclesFor = (hz: number) => hz / 40
const TARGET_SHOW_MS = 900

/**
 * The tone as a picture, so the game works with the sound off too: the target's wave shows while it
 * plays, then the wave follows your slider. Compare how tightly packed the waves are.
 */
function Wave({ hz, showing }: { hz: number | null; showing: 'target' | 'mine' | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const w = c.clientWidth, h = c.clientHeight
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    g.clearRect(0, 0, w, h)
    const st = getComputedStyle(c)
    g.strokeStyle = st.getPropertyValue('--line').trim() || '#ccc'
    g.lineWidth = 1
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke()
    if (hz == null || !showing) return
    g.strokeStyle = showing === 'target' ? st.getPropertyValue('--ink').trim() || '#111' : st.getPropertyValue('--game').trim() || '#f8c'
    g.lineWidth = showing === 'target' ? 3 : 3.5
    g.lineJoin = 'round'
    const k = cyclesFor(hz)
    g.beginPath()
    for (let x = 0; x <= w; x += 1) {
      const y = h / 2 - Math.sin((x / w) * k * Math.PI * 2) * (h * 0.36)
      if (x) g.lineTo(x, y); else g.moveTo(x, y)
    }
    g.stroke()
  }, [hz, showing])
  return (
    <div className="pitch-wave">
      <canvas ref={canvas} aria-hidden="true" data-showing={showing ?? ''} data-cycles={hz == null ? '' : cyclesFor(hz).toFixed(2)} />
      <span className="small muted">{showing === 'target' ? 'The target' : showing === 'mine' ? 'Your tone' : 'Listen or look: the wave shows the tone'}</span>
    </div>
  )
}

/** One round: listen (or watch the wave), slide, lock in. */
function Round({ target, label, tiles, onLock }: { target: number; label: string; tiles?: Attempt[]; onLock: (cents: number) => void }) {
  const [slider, setSlider] = useState(randomSlider)
  const [heard, setHeard] = useState(false)
  const [showTarget, setShowTarget] = useState(false)
  const targetTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(targetTimer.current), [])
  const lastPlay = useRef(0)
  function playTarget() {
    play(target)
    setHeard(true)
    setShowTarget(true)
    clearTimeout(targetTimer.current)
    targetTimer.current = setTimeout(() => setShowTarget(false), TARGET_SHOW_MS)
  }

  function playMine() {
    const now = performance.now()
    if (now - lastPlay.current < 120) return
    lastPlay.current = now
    play(toHz(slider), 450)
  }

  return (
    <Stage>
      <div className="stack">
        <div className="between">
          <span className="small muted">{label}</span>
          {tiles && <AttemptTiles attempts={tiles} />}
        </div>
        <Button size="lg" block color={game.color} onClick={playTarget} data-primary={heard ? undefined : 'click'} hint={heard ? undefined : 'Space'}>
          {heard ? 'Hear it again' : 'Listen to the target'}
        </Button>
        <Wave hz={showTarget ? target : heard ? toHz(slider) : null} showing={showTarget ? 'target' : heard ? 'mine' : null} />
        <label className="eyebrow muted" htmlFor="pitch">Your tone: lower ← → higher</label>
        <input
          id="pitch"
          type="range"
          min={0}
          max={1000}
          value={slider}
          disabled={!heard}
          onChange={(e) => setSlider(+e.target.value)}
          onPointerUp={playMine}
          onKeyUp={playMine}
          style={{ width: '100%', height: 44, accentColor: 'var(--game)' }}
        />
        <div className="row">
          <Button variant="secondary" disabled={!heard} onClick={playMine}>Play mine</Button>
          <Button
            color={game.color}
            disabled={!heard}
            data-primary={heard ? 'click' : undefined}
            hint={heard ? 'Space' : undefined}
            onClick={() => {
              const c = cents(toHz(slider), target)
              if (grade(c) === 'miss') feel.bad()
              else feel.good()
              onLock(c)
            }}
          >
            Lock in
          </Button>
        </div>
        {!heard && <p className="small muted" style={{ margin: 0 }}>Turn your sound up and listen, or keep it off and watch the wave: the more tightly packed, the higher the tone.</p>}
      </div>
    </Stage>
  )
}

type Today = { done: number[][]; current: number[] }

function loadTodayState(): Today {
  const v = loadToday<Today | number[] | null>(game.slug, null)
  if (!v) return { done: [], current: [] }
  if (Array.isArray(v)) return v.length >= ROUNDS ? { done: [v], current: [] } : { done: [], current: v } // older format
  return v
}

const score = (r: number[]) => Math.round(r.reduce((s, x) => s + accuracy(x), 0) / r.length)

export default function PitchMatch() {
  // Unlimited tries at today's three tones; the best try counts and is what gets shared.
  // A challenge from another day plays that day's tones once, without touching today's tries or streak.
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const targets = targetsFor(day)
  const [state, setState] = useState<Today>(() => (oneOff ? { done: [], current: [] } : loadTodayState()))
  const [playing, setPlaying] = useState(state.done.length === 0 || state.current.length > 0)
  const { done, current } = state
  // Only a try finished on this visit counts as a new finish (not reopening today's result).
  const [fresh, setFresh] = useState(false)
  const round = current.length
  const stats = getStats(game.slug)

  function lock(c: number) {
    const cur = [...current, c]
    const next: Today = cur.length >= ROUNDS ? { done: [...done, cur], current: [] } : { done, current: cur }
    setState(next)
    if (!oneOff) saveToday(game.slug, next)
    if (cur.length >= ROUNDS) {
      const best = Math.max(...next.done.map(score))
      if (!oneOff) recordDaily(game.slug, best, new Date(), `${best}%`)
      setFresh(true)
      setPlaying(false)
    }
  }

  const results = playing ? current : done[done.length - 1]
  const bestTry = done.length ? done.reduce((a, b) => (score(b) > score(a) ? b : a)) : []
  const best = done.length ? score(bestTry) : 0
  const tries = `${done.length} ${done.length === 1 ? 'try' : 'tries'}`

  return (
    <>
      {playing && (
        <Round
          key={`${done.length}-${round}`}
          target={targets[round]}
          label={`Tone ${round + 1} of ${ROUNDS}${done.length ? ` · try ${done.length + 1}` : ''}`}
          tiles={Array.from({ length: ROUNDS }, (_, i) => (i < current.length ? grade(current[i]) : 'empty'))}
          onLock={lock}
        />
      )}

      {results && results.length > 0 && (
        <ul className="small muted" style={{ listStyle: 'none', padding: 0, margin: 'var(--space-3) 0 0', display: 'grid', gap: 'var(--space-1)', textAlign: 'center' }}>
          {results.map((c, i) => (
            <li key={i}>Tone {i + 1}: {describe(c)}</li>
          ))}
        </ul>
      )}

      {!playing && done.length > 0 && (
        <ResultCard
          game={game}
          headline={`${best}% accurate`}
          detail={<>Your best of {tries} {oneOff ? `on the ${puzzleLabel(day)} tones` : 'today'}{done.length > 1 ? ` · last try ${score(done[done.length - 1])}%` : ''}{stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🎵 Pitch Match ${puzzleLabel(day)}\n${bestTry.map(square).join('')} ${best}% accurate\nBest of ${tries}`}
          finishData={{ accuracy: best, tries: done.length }}
          trackFinish={fresh}
          challenge={{ seed: dateKey(day), score: best, text: `${best}%`, lowerIsBetter: false }}
          onReplay={() => setPlaying(true)}
          replayLabel="Try again"
        />
      )}
    </>
  )
}
