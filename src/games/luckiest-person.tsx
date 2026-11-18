import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dailyRandom, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Button, Stage } from '../ui'

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

function randomDeck(): number[] {
  const out: number[] = []
  while (out.length < CARDS) {
    const n = 1 + Math.floor(Math.random() * 100)
    if (!out.includes(n)) out.push(n)
  }
  return out
}

/** The row of five cards. `pick` is the chosen position; all turn over once `reveal` is set. */
function CardRow({ cards, pick, reveal, onPick }: { cards: number[]; pick: number | null; reveal: boolean; onPick: (i: number) => void }) {
  return (
    <div className="lucky-cards" role="group" aria-label="Cards">
      {cards.map((v, i) => {
        const open = i === pick || (reveal && pick != null)
        return (
          <button
            key={i}
            className="lucky-card"
            data-open={open || undefined}
            data-picked={i === pick || undefined}
            disabled={pick != null}
            onClick={() => onPick(i)}
            aria-label={open ? `Card ${i + 1}: ${v}` : `Card ${i + 1}, face down`}
          >
            <span className="lucky-card-face">{open ? v : '?'}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Practice: a random deck each time. It never counts toward today's pick or the streak. */
function Practice({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState(randomDeck)
  const [pick, setPick] = useState<number | null>(null)
  const sorted = [...cards].sort((a, b) => b - a)
  const rank = pick != null ? sorted.indexOf(cards[pick]) + 1 : null
  return (
    <Stage>
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>
          {rank == null ? 'Practice deck: doesn’t count. Pick one.' : `You drew ${cards[pick!]}, the ${ordinal(rank)} of five.`}
        </p>
        <CardRow cards={cards} pick={pick} reveal={pick != null} onPick={(i) => { setPick(i); feel.tap() }} />
        {pick != null && (
          <div className="row">
            <Button color={game.color} onClick={() => { setCards(randomDeck()); setPick(null) }}>Deal again</Button>
            <Button variant="secondary" onClick={onBack}>Back to today</Button>
          </div>
        )}
      </div>
    </Stage>
  )
}

const ordinal = (n: number) => ['best', '2nd best', 'middle', '2nd worst', 'worst'].at(n - 1) ?? ''

export default function LuckiestPerson() {
  // A challenge from another day deals that day's cards for one pick that isn't saved.
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const cards = cardsFor(day)
  const [pick, setPick] = useState<number | null>(() => {
    if (oneOff) return null
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
    if (!oneOff) {
      saveToday(game.slug, i) // saved first so a reload can't pick again
      recordDaily(game.slug, v, new Date(), String(v))
    }
    setPick(i)
    if (r === 1) feel.good()
    else if (r === CARDS) feel.bad()
    else feel.tap()
    timer.current = setTimeout(() => setRevealAll(true), 700)
  }

  const [practice, setPractice] = useState(false)
  const stats = getStats(game.slug)
  if (practice) return <Practice onBack={() => setPractice(false)} />
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
          <CardRow cards={cards} pick={pick} reveal={revealAll} onPick={choose} />
        </div>
      </Stage>

      {value != null && rank != null && (
        <ResultCard
          game={game}
          headline={`You drew ${value}`}
          detail={<>The {ordinal(rank)} of {oneOff ? 'that day’s' : 'today’s'} five{stats.streak > 1 && <> · {stats.streak} days in a row</>}</>}
          shareText={`🍀 Luckiest Person ${puzzleLabel(day)}\nDrew ${value}, the ${ordinal(rank)} of 5`}
          trackFinish={!alreadyPicked.current}
          finishData={{ value, rank }}
          challenge={{ seed: dateKey(day), score: value, text: String(value), lowerIsBetter: false }}
          extra={<Button variant="ghost" onClick={() => setPractice(true)}>Practice with a random deck</Button>}
        />
      )}
    </>
  )
}
