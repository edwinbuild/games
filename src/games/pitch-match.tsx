import { useRef, useState } from 'react'
import { getGame } from './registry'
import { dailyRandom, puzzleLabel } from '../shell/daily'
import { feel, tone } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, recordPlay, saveToday } from '../shell/stats'
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

function Practice({ onBack }: { onBack: () => void }) {
  const [target, setTarget] = useState(() => toHz(150 + Math.random() * 700))
  const [result, setResult] = useState<number | null>(null)
  const best = getStats('pitch-match-practice').best

  if (result === null) {
    return <Round key={target} target={target} label="Practice: random tone" onLock={(c) => {
      setResult(c)
      recordPlay('pitch-match-practice', accuracy(c), undefined, `${accuracy(c)}%`)
    }} />
  }
  return (
    <Stage>
      <div className="stack">
        <p className="result" style={{ margin: 0 }}>{describe(result)}</p>
        <p className="small muted" style={{ margin: 0 }}>{accuracy(result)}% accurate{best != null ? ` · best practice ${best}%` : ''}</p>
        <div className="row">
          <Button color={game.color} onClick={() => { setResult(null); setTarget(toHz(150 + Math.random() * 700)) }}>Next tone</Button>
          <Button variant="secondary" onClick={onBack}>Back to today</Button>
        </div>
      </div>
    </Stage>
  )
}

export default function PitchMatch() {
  const targets = targetsFor()
  const [results, setResults] = useState<number[]>(() => loadToday(game.slug, [] as number[]))
  const [practice, setPractice] = useState(false)
  const round = results.length
  const done = round >= ROUNDS
  const avg = results.length ? Math.round(results.reduce((a, b) => a + accuracy(b), 0) / results.length) : 0
  const stats = getStats(game.slug)

  if (practice) return <Practice onBack={() => setPractice(false)} />

  function lock(c: number) {
    const next = [...results, c]
    setResults(next)
    saveToday(game.slug, next)
    if (next.length >= ROUNDS) {
      const a = Math.round(next.reduce((s, x) => s + accuracy(x), 0) / next.length)
      recordDaily(game.slug, a, new Date(), `${a}%`)
    }
  }

  return (
    <>
      {!done && (
        <Round
          key={round}
          target={targets[round]}
          label={`Tone ${round + 1} of ${ROUNDS}`}
          tiles={Array.from({ length: ROUNDS }, (_, i) => (i < results.length ? grade(results[i]) : 'empty'))}
          onLock={lock}
        />
      )}

      {results.length > 0 && (
        <ul className="small muted" style={{ listStyle: 'none', padding: 0, margin: 'var(--space-3) 0 0', display: 'grid', gap: 'var(--space-1)', textAlign: 'center' }}>
          {results.map((c, i) => (
            <li key={i}>Tone {i + 1}: {describe(c)}</li>
          ))}
        </ul>
      )}

      {done && (
        <ResultCard
          game={game}
          headline={`${avg}% accurate`}
          detail={stats.streak > 1 ? `${stats.streak} day streak` : undefined}
          shareText={`🎵 Pitch Match ${puzzleLabel()}\n${results.map(square).join('')} ${avg}% accurate`}
          finishData={{ accuracy: avg }}
          extra={<Button variant="ghost" onClick={() => setPractice(true)}>Practice with random tones</Button>}
        />
      )}
    </>
  )
}
