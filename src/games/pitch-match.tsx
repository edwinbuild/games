import { useRef, useState } from 'react'
import { getGame } from './registry'
import { dailyRandom, puzzleLabel } from '../shell/daily'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { AttemptTiles, Button, Stage, type Attempt } from '../ui'

const game = getGame('pitch-match')
const ROUNDS = 3
const MIN_HZ = 200
const MAX_HZ = 1000

// Slider position (0–1000) <-> frequency, on a log scale so it feels even.
const toHz = (v: number) => MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, v / 1000)
const cents = (f: number, target: number) => Math.round(1200 * Math.log2(f / target))
const accuracy = (c: number) => Math.max(0, Math.round(100 - Math.abs(c) / 2))
const grade = (c: number): Attempt => (Math.abs(c) < 15 ? 'hit' : Math.abs(c) < 50 ? 'near' : 'miss')
const square = (c: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(c)]

export function targetsFor(d = new Date()): number[] {
  const r = dailyRandom(game.slug, d)
  return Array.from({ length: ROUNDS }, () => toHz(150 + r() * 700))
}

let ctx: AudioContext | null = null
function beep(hz: number, ms = 700) {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = hz
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
  gain.gain.setValueAtTime(0.25, t + ms / 1000 - 0.08)
  gain.gain.linearRampToValueAtTime(0, t + ms / 1000)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + ms / 1000)
}

export default function PitchMatch() {
  const targets = targetsFor()
  const [results, setResults] = useState<number[]>(() => loadToday(game.slug, [] as number[]))
  const [slider, setSlider] = useState(() => Math.round(Math.random() * 1000))
  const [heard, setHeard] = useState(false)
  const lastPlay = useRef(0)
  const round = results.length
  const done = round >= ROUNDS

  function playMine(v = slider) {
    const now = performance.now()
    if (now - lastPlay.current < 120) return
    lastPlay.current = now
    beep(toHz(v), 450)
  }

  function lockIn() {
    const c = cents(toHz(slider), targets[round])
    const next = [...results, c]
    setResults(next)
    saveToday(game.slug, next)
    setHeard(false)
    setSlider(Math.round(Math.random() * 1000))
    if (next.length >= ROUNDS) {
      const avg = Math.round(next.reduce((a, b) => a + accuracy(b), 0) / next.length)
      recordDaily(game.slug, avg)
    }
  }

  const avg = results.length ? Math.round(results.reduce((a, b) => a + accuracy(b), 0) / results.length) : 0
  const stats = getStats(game.slug)

  return (
    <>
      {!done && (
        <Stage>
          <div className="stack">
            <div className="between">
              <span className="small muted">Tone {round + 1} of {ROUNDS} · sound on</span>
              <AttemptTiles attempts={Array.from({ length: ROUNDS }, (_, i) => (i < results.length ? grade(results[i]) : 'empty'))} />
            </div>
            <Button size="lg" block color={game.color} onClick={() => { beep(targets[round]); setHeard(true) }}>
              {heard ? 'Hear it again' : 'Listen to the target'}
            </Button>
            <label className="eyebrow muted" htmlFor="pitch">Your tone</label>
            <input
              id="pitch"
              type="range"
              min={0}
              max={1000}
              value={slider}
              disabled={!heard}
              onChange={(e) => setSlider(+e.target.value)}
              onPointerUp={() => playMine()}
              onKeyUp={() => playMine()}
              style={{ width: '100%', height: 44, accentColor: 'var(--game)' }}
            />
            <div className="row">
              <Button variant="secondary" disabled={!heard} onClick={() => playMine()}>Play mine</Button>
              <Button color={game.color} disabled={!heard} onClick={lockIn}>Lock in</Button>
            </div>
            {!heard && <p className="small muted" style={{ margin: 0 }}>Listen first, then slide.</p>}
          </div>
        </Stage>
      )}

      {results.length > 0 && (
        <p className="small muted center">
          {results.map((c, i) => (
            <span key={i} style={{ marginRight: 12 }}>
              Tone {i + 1}: {c === 0 ? 'spot on' : `${Math.abs(c)} cents ${c > 0 ? 'high ↑' : 'low ↓'}`}
            </span>
          ))}
        </p>
      )}

      {done && (
        <ResultCard
          game={game}
          headline={`${avg}% accurate`}
          detail={stats.streak > 0 ? `${stats.streak} day streak` : undefined}
          shareText={`🎵 Pitch Match ${puzzleLabel()}\n${results.map(square).join('')} ${avg}% accurate`}
          finishData={{ accuracy: avg }}
        />
      )}
    </>
  )
}
