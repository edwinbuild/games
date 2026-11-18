import { useRef, useState } from 'react'
import { getGame } from './registry'
import { dailyRandom, puzzleLabel } from '../shell/daily'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'

const game = getGame('pitch-match')
const ROUNDS = 3
const MIN_HZ = 200
const MAX_HZ = 1000

// Slider position (0–1000) <-> frequency, on a log scale so it feels even.
const toHz = (v: number) => MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, v / 1000)
const cents = (f: number, target: number) => Math.round(1200 * Math.log2(f / target))
const accuracy = (c: number) => Math.max(0, Math.round(100 - Math.abs(c) / 2))
const square = (c: number) => (Math.abs(c) < 15 ? '🟩' : Math.abs(c) < 50 ? '🟨' : '🟥')

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
        <div className="stage" style={{ display: 'grid', gap: 16 }}>
          <p className="label" style={{ margin: 0 }}>Tone {round + 1} of {ROUNDS} · 🔊 sound on</p>
          <button className="btn btn-big" onClick={() => { beep(targets[round]); setHeard(true) }}>
            🎧 Listen to target
          </button>
          <label className="label" htmlFor="pitch">Your tone</label>
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
            style={{ width: '100%', height: 44, accentColor: 'var(--accent)' }}
          />
          <div className="row">
            <button className="btn" disabled={!heard} onClick={() => playMine()}>▶ Play mine</button>
            <button className="btn btn-primary" disabled={!heard} onClick={lockIn}>Lock in</button>
          </div>
          {!heard && <p className="label" style={{ margin: 0 }}>Listen first, then slide.</p>}
        </div>
      )}

      {results.length > 0 && (
        <p className="label" style={{ textAlign: 'center' }}>
          {results.map((c, i) => (
            <span key={i} style={{ marginRight: 12 }}>
              {square(c)} {c === 0 ? 'spot on' : `${Math.abs(c)} cents ${c > 0 ? 'high' : 'low'}`}
            </span>
          ))}
        </p>
      )}

      {done && (
        <ResultCard
          game={game}
          headline={`${avg}% accurate`}
          detail={<>{stats.streak > 0 && <>🔥 {stats.streak} day streak</>}</>}
          shareText={`🎵 Pitch Match ${puzzleLabel()}\n${results.map(square).join('')} ${avg}% accurate`}
          finishData={{ accuracy: avg }}
        />
      )}
    </>
  )
}
