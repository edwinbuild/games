import { useRef, useState } from 'react'
import { getGame } from './registry'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dailyRandom, dateKey, puzzleLabel } from '../shell/daily'
import { feel, tone } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { AttemptTiles, Button, Stage, type Attempt } from '../ui'

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

/** One round: listen, slide, lock in. */
function Round({ target, label, tiles, onLock }: { target: number; label: string; tiles?: Attempt[]; onLock: (cents: number) => void }) {
  const [slider, setSlider] = useState(randomSlider)
  const [heard, setHeard] = useState(false)
  const lastPlay = useRef(0)

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
        <Button size="lg" block color={game.color} onClick={() => { play(target); setHeard(true) }}>
          {heard ? 'Hear it again' : 'Listen to the target'}
        </Button>
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
        {!heard && <p className="small muted" style={{ margin: 0 }}>Turn your phone's sound up, then listen first.</p>}
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
          challenge={{ seed: dateKey(day), score: best, text: `${best}%`, lowerIsBetter: false }}
          onReplay={() => setPlaying(true)}
          replayLabel="Try again"
        />
      )}
    </>
  )
}
