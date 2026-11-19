import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { ResultCard } from '../shell/ResultCard'
import { newSeed, readChallenge } from '../shell/challenge'
import { seededRandom } from '../shell/daily'
import { feel } from '../shell/feel'
import { getStats, recordPlay } from '../shell/stats'
import { Score, Stage } from '../ui'
import { levelSetup } from './shared/odd-grid'
import { OddGrid } from './shared/OddGrid'

const game = getGame('odd-one-out')
const TIME = 60
const WRONG_PENALTY = 3

export default function OddOneOut() {
  // A challenge link plays its grids first; every other game gets a new seed.
  const challenge = readChallenge(game.slug)
  const [seed, setSeed] = useState(() => challenge?.s ?? newSeed())
  const rng = useRef(seededRandom(seed))
  const [started, setStarted] = useState(false)
  const [level, setLevel] = useState(1)
  const [setup, setSetup] = useState(() => levelSetup(1, rng.current))
  const [left, setLeft] = useState(TIME)
  const [shake, setShake] = useState<number | null>(null)
  const streak = useRef(0) // correct taps in a row, for the climbing pop
  const done = started && left <= 0

  useEffect(() => {
    if (!started || done) return
    const id = setInterval(() => setLeft((t) => Math.max(0, +(t - 0.1).toFixed(1))), 100)
    return () => clearInterval(id)
  }, [started, done])

  useEffect(() => {
    if (done) recordPlay(game.slug, level - 1, undefined, `Lv ${level - 1}`)
  }, [done, level])

  function pick(i: number) {
    if (done) return
    if (!started) setStarted(true)
    if (i === setup.oddIndex) {
      feel.pop(streak.current++)
      setLevel(level + 1)
      setSetup(levelSetup(level + 1, rng.current))
    } else {
      streak.current = 0
      feel.bad()
      setLeft((t) => Math.max(0, t - WRONG_PENALTY))
      setShake(i)
      setTimeout(() => setShake(null), 300)
    }
  }

  function reset() {
    // Replays always get a new puzzle: replaying a challenge you have now seen would make a memorised run a best.
    const next = newSeed()
    setSeed(next)
    rng.current = seededRandom(next)
    streak.current = 0
    setStarted(false)
    setLevel(1)
    setSetup(levelSetup(1, rng.current))
    setLeft(TIME)
  }

  const score = level - 1
  const best = getStats(game.slug).best

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <Score label={done ? 'Cleared' : 'Level'} value={done ? score : level} size="md" bump />
        <Score label={done ? "Time's up" : started ? 'Time' : 'Starts on first tap'} value={`${Math.ceil(left)}s`} size="md" />
      </div>

      {!done && (
        <Stage flush>
          <OddGrid setup={setup} level={level} shake={shake} onPick={pick} />
        </Stage>
      )}
      {shake !== null && <p className="small center" style={{ color: 'var(--danger)', margin: 'var(--space-2) 0 0' }}>✕ Wrong one, −{WRONG_PENALTY}s</p>}

      {done && (
        <ResultCard
          game={game}
          headline={`${score} level${score === 1 ? '' : 's'} cleared`}
          detail={best != null && best > score ? `Your best: level ${best}` : undefined}
          shareText={`👀 Odd One Out\nCleared ${score} level${score === 1 ? '' : 's'} in 60s`}
          finishData={{ level: score }}
          challenge={{ seed, score, text: `Lv ${score}`, lowerIsBetter: false }}
          onReplay={reset}
        />
      )}
    </>
  )
}
