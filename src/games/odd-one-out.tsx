import { useEffect, useState } from 'react'
import { getGame } from './registry'
import { ResultCard } from '../shell/ResultCard'
import { getStats, recordPlay } from '../shell/stats'
import { Score, Stage } from '../ui'

const game = getGame('odd-one-out')
const TIME = 60
const WRONG_PENALTY = 3

// Pairs that look alike, roughly ordered from easy to hard to tell apart.
const PAIRS: [string, string][] = [
  ['🍎', '🍌'], ['🐶', '🐱'], ['⚽', '🏀'], ['🌞', '🌧️'],
  ['🍎', '🍅'], ['🐶', '🐕'], ['😀', '😃'], ['🙂', '🙃'],
  ['🌕', '🌝'], ['🐢', '🦎'], ['😐', '😑'], ['🕐', '🕑'],
  ['😄', '😆'], ['🐱', '😺'], ['🌑', '🌚'], ['⭐', '🌟'],
  ['😊', '☺️'], ['😗', '😙'], ['🕒', '🕓'], ['😁', '😀'],
]

function levelSetup(level: number) {
  const size = Math.min(3 + Math.floor((level - 1) / 2), 8) // 3×3 → 8×8
  const tier = Math.min(Math.floor((level - 1) / 2) * 2, PAIRS.length - 4)
  const [a, b] = PAIRS[tier + Math.floor(Math.random() * 4)]
  const flip = Math.random() < 0.5
  return { size, common: flip ? a : b, odd: flip ? b : a, oddIndex: Math.floor(Math.random() * size * size) }
}

export default function OddOneOut() {
  const [started, setStarted] = useState(false)
  const [level, setLevel] = useState(1)
  const [setup, setSetup] = useState(() => levelSetup(1))
  const [left, setLeft] = useState(TIME)
  const [shake, setShake] = useState<number | null>(null)
  const done = started && left <= 0

  useEffect(() => {
    if (!started || done) return
    const id = setInterval(() => setLeft((t) => Math.max(0, +(t - 0.1).toFixed(1))), 100)
    return () => clearInterval(id)
  }, [started, done])

  useEffect(() => {
    if (done) recordPlay(game.slug, level - 1)
  }, [done, level])

  function pick(i: number) {
    if (done) return
    if (!started) setStarted(true)
    if (i === setup.oddIndex) {
      setLevel(level + 1)
      setSetup(levelSetup(level + 1))
    } else {
      setLeft((t) => Math.max(0, t - WRONG_PENALTY))
      setShake(i)
      setTimeout(() => setShake(null), 300)
    }
  }

  function reset() {
    setStarted(false)
    setLevel(1)
    setSetup(levelSetup(1))
    setLeft(TIME)
  }

  const score = level - 1
  const best = getStats(game.slug).best

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <Score label="Level" value={level} size="md" />
        <Score label={started ? 'Time' : 'Starts on first tap'} value={`${Math.ceil(left)}s`} size="md" />
      </div>

      {!done && (
        <Stage flush>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${setup.size}, 1fr)`, gap: setup.size > 5 ? 4 : 'var(--space-2)' }}>
            {Array.from({ length: setup.size * setup.size }, (_, i) => (
              <button
                key={`${level}-${i}`}
                className="qg-cell"
                data-state={shake === i ? 'wrong' : undefined}
                onPointerDown={() => pick(i)}
                onClick={(e) => e.detail === 0 && pick(i)}
                aria-label={`Square ${i + 1}`}
                style={{ fontSize: `min(${Math.floor((40 / setup.size) * 1.6)}vw, ${Math.floor(220 / setup.size)}px)`, borderRadius: setup.size > 5 ? 'var(--radius-sm)' : undefined }}
              >
                {i === setup.oddIndex ? setup.odd : setup.common}
              </button>
            ))}
          </div>
        </Stage>
      )}
      {shake !== null && <p className="small center" style={{ color: 'var(--danger)', margin: 'var(--space-2) 0 0' }}>✕ Wrong one, −{WRONG_PENALTY}s</p>}

      {done && (
        <ResultCard
          game={game}
          headline={`Level ${score}`}
          detail={best != null ? `Your best: level ${best}` : undefined}
          shareText={`👀 Odd One Out\nCleared ${score} level${score === 1 ? '' : 's'} in 60s`}
          finishData={{ level: score }}
          onReplay={reset}
        />
      )}
    </>
  )
}
