import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { dailyRandom, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Stage } from '../ui'

const game = getGame('luckiest-person')
const CARDS = 5

/** Today's five cards, the same for everyone: five different numbers from 1 to 100. */
export function cardsFor(d = new Date()): number[] {
  const r = dailyRandom(game.slug, d)
  const out: number[] = []
  while (out.length < CARDS) {
    const n = 1 + Math.floor(r() * 100)
    if (!out.includes(n)) out.push(n)
  }
  return out
}

const ordinal = (n: number) => ['best', '2nd best', 'middle', '2nd worst', 'worst'].at(n - 1) ?? ''

export default function LuckiestPerson() {
  const cards = cardsFor()
  const [pick, setPick] = useState<number | null>(() => {
    const saved = loadToday<number | null>(game.slug, null)
    // Only a card position (0–4) counts; anything else is from the old version of the game.
    return saved != null && Number.isInteger(saved) && saved >= 0 && saved < CARDS ? saved : null
  })
  const [revealAll, setRevealAll] = useState(pick != null)
  const alreadyPicked = useRef(pick != null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const sorted = [...cards].sort((a, b) => b - a)
  const value = pick != null ? cards[pick] : null
  const rank = value != null ? sorted.indexOf(value) + 1 : null

  function choose(i: number) {
    if (pick != null) return
    const v = cards[i]
    const r = sorted.indexOf(v) + 1
    saveToday(game.slug, i) // saved first so a reload can't pick again
    recordDaily(game.slug, v, new Date(), String(v))
    setPick(i)
    if (r === 1) feel.good()
    else if (r === CARDS) feel.bad()
    else feel.tap()
    timer.current = setTimeout(() => setRevealAll(true), 700)
  }

  const stats = getStats(game.slug)
  const verdict =
    rank === 1 ? 'You picked the best card.'
    : rank === CARDS ? 'You picked the worst card.'
    : `The best card was ${sorted[0]}.`

  return (
    <>
      <Stage>
        <div className="stack">
          <p className="small muted" style={{ margin: 0 }}>
            {pick == null ? 'Five cards, numbered 1 to 100. Pick one.' : verdict}
          </p>
          <div className="lucky-cards" role="group" aria-label="Today's cards">
            {cards.map((v, i) => {
              const open = i === pick || (revealAll && pick != null)
              return (
                <button
                  key={i}
                  className="lucky-card"
                  data-open={open || undefined}
                  data-picked={i === pick || undefined}
                  disabled={pick != null}
                  onClick={() => choose(i)}
                  aria-label={open ? `Card ${i + 1}: ${v}` : `Card ${i + 1}, face down`}
                >
                  <span className="lucky-card-face">{open ? v : '?'}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Stage>

      {value != null && rank != null && (
        <ResultCard
          game={game}
          headline={`You drew ${value}`}
          detail={<>The {ordinal(rank)} of today's five{stats.streak > 1 && <> · {stats.streak} days in a row</>}</>}
          shareText={`🍀 Luckiest Person ${puzzleLabel()}\nDrew ${value}, the ${ordinal(rank)} of 5`}
          trackFinish={!alreadyPicked.current}
          finishData={{ value, rank }}
        />
      )}
    </>
  )
}
